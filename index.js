const fs = require('fs').promises;
const { parse } = require('csv-parse');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const FILE_PATH = './test.csv'; 
const CONTENT_TYPE = 'test-organizations';

// Función para leer y parsear el archivo CSV
async function readCSV(filePath) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' });
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });
}

// Función para leer y parsear el archivo JSON
async function readJSON(filePath) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(content);
}

// Función para enviar datos a Strapi
async function sendToStrapi(data) {
  const validData = (({ idfromcsv, name, description, website, email, phone }) => ({ idfromcsv, name, description, website, email, phone }))(data);
  console.log('Datos a enviar:', JSON.stringify(data, null, 2));
  try {
    const response = await axios.post(`${STRAPI_URL}/api/${CONTENT_TYPE}`, {
      data: validData
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    });
    console.log(`Datos enviados con éxito. ID: ${response.data.data.id}`);
  } catch (error) {
    console.error('Error al enviar datos a Strapi:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
      console.error('Estado de la respuesta:', error.response.status);
      console.error('Encabezados de la respuesta:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    } else {
      console.error('Error al configurar la solicitud:', error.message);
    }
  }
}

// Función principal
async function main() {
  try {
    let data;
    if (FILE_PATH.endsWith('.csv')) {
      data = await readCSV(FILE_PATH);
    } else if (FILE_PATH.endsWith('.json')) {
      data = await readJSON(FILE_PATH);
    } else {
      throw new Error('Formato de archivo no soportado. Use CSV o JSON.');
    }

    for (const item of data) {
      await sendToStrapi(item);
    }

    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();