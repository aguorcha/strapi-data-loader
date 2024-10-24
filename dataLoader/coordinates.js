const fs = require('fs').promises;
const axios = require('axios');
require('dotenv').config();

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

async function readSedesFile() {
  try {
    const data = await fs.readFile('sedes.json', 'utf-8');
    const jsonData = JSON.parse(data);
    return jsonData.rows;
  } catch (error) {
    console.log('Error reading sedes.json', error);
    throw error;
  }
}

async function getCoordinates(sede) {
  const { tipo_calle, direccion, numero, localidad, provincia, cp } = sede;

  if (!direccion || !localidad || !provincia) {
    console.log(`Skipping sede ${sede.id} due to incomplete address information`);
    return null;
  }

  const address = `${tipo_calle || ''} ${direccion} ${numero || ''}`.trim();
  const query = `${address}, ${localidad}, ${provincia} ${cp || ''}`.trim();
  const encodedQuery = encodeURIComponent(query);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`;

  try {
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        country: 'es'
      }
    });

    if (response.data.features && response.data.features.length > 0) {
      const [longitude, latitude] = response.data.features[0].center;
      return { id: sede.id, longitude, latitude };
    } else {
      console.log(`No coordinates found for sede ${sede.id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting coordinates for sede ${sede.id}:`, error.message);
    return null;
  }
}

async function processSedesAndSaveCoordinates() {
  try {
    const sedes = await readSedesFile();
    const coordinatesPromises = sedes.map(getCoordinates);
    const coordinates = await Promise.all(coordinatesPromises);
    const validCoordinates = coordinates.filter(coord => coord !== null);

    await fs.writeFile('coordinates.json', JSON.stringify(validCoordinates, null, 2));
    console.log('Coordinates saved to coordinates.json');
  } catch (error) {
    console.error('Error procesing sedes and saving coordinates:', error);
  }
}

processSedesAndSaveCoordinates();