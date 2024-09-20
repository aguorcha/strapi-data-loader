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

// Función para obtener todos los registros actuales con paginación
async function getAllRecords() {
  let allRecords = [];
  let page = 1;
  let pageSize = 10;
  let totalRecords = 0;

  do {
    try {
      const response = await axios.get(`${STRAPI_URL}/api/${CONTENT_TYPE}?pagination[page]=${page}&pagination[pageSize]=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`
        }
      });
      const records = response.data.data;
      totalRecords = response.data.meta.pagination.total;
      /* allRecords = allRecords.concat(records); */

      console.log('Registros obtenidos:', records);

      // Verifica que estés usando el campo de ID correcto
      allRecords = allRecords.concat(records.map(record => record.id));
      page += 1; // Avanzamos a la siguiente página
    } catch (error) {
      console.error('Error al obtener registros de Strapi:', error.message);
      throw error;
    }
  } while (allRecords.length < totalRecords);
  console.log(allRecords.map(record => record.id));

  return allRecords; // Retorna todos los registros
}

// Función para eliminar un registro por ID
async function deleteRecord(id) {
  try {
    const response = await axios.delete(`${STRAPI_URL}/api/${CONTENT_TYPE}/${id}`, {
      headers: {
        'Authorization': `Bearer ${STRAPI_API_TOKEN}`
      }
    });
    if (response.status === 204) {
      console.log(`Registro con ID ${id} eliminado.`);
    } else {
      console.error(`Error al eliminar el registro con ID ${id}: estado HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Error al eliminar el registro con ID ${id}:`, error.response ? error.response.data : error.message);
  }
}

// Función para eliminar **todos** los registros
async function deleteAllRecords() {
  let records = await getAllRecords();

  if (records.length === 0) {
    console.log('No hay registros para eliminar.');
    return;
  }

  // Eliminar cada registro individualmente
  // Este for no hace nada
  for (const record of records) {
    await deleteRecord(record.id);
  }
  // Prueba manual que no funciona tampoco (171,172,173)
  // deleteRecord(171);

  console.log('Todos los registros han sido eliminados.');
}

function adjustData(data) {
  return {
    idfromcsv: data.idfromcsv || '',
    name: data.name || '',
    description: data.description || '',
    website: data.website || '',
    email: data.email || '',
    phone: data.phone || '',
    description_en: data.description_en || '',
    description_ar: data.description_ar || '',
    organization: data.organization || '' // Aseguramos que 'organization' también esté presente
  };
}

// Función para enviar datos a Strapi
async function sendToStrapi(data) {
  // Validar datos antes de enviarlos
  if (!data.email) {
    console.error('Error: El campo email no puede estar vacío');
    return;
  }

  const validData = (({ idfromcsv, name, description, website, email, phone, description_en, description_ar }) => ({ idfromcsv, name, description, website, email, phone, description_en, description_ar }))(data);
  console.log('Datos a enviar:', JSON.stringify(validData, null, 2));
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
    await deleteAllRecords();  // Elimina todos los registros

    let data;
    if (FILE_PATH.endsWith('.csv')) {
      data = await readCSV(FILE_PATH);
    } else if (FILE_PATH.endsWith('.json')) {
      data = await readJSON(FILE_PATH);
    } else {
      throw new Error('Formato de archivo no soportado. Use CSV o JSON.');
    }

    let i = 0;
    for (const item of data) {
      await sendToStrapi(item);
      i++;
      console.log(i);
        // Envía los datos nuevos
    }

    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
