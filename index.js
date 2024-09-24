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
    parse(content, { columns: true, skip_empty_lines: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

// Función para leer un archivo JSON
async function readJSON(filePath) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(content);
}

// Validar si los campos obligatorios están presentes
function validateRequiredFields(data) {
  const requiredFields = ['idfromcsv', 'name', 'description'];

  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(`Error: El campo ${field} es obligatorio y está vacío`);
      return false;
    }
  }
  return true;
}

// Validación de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && typeof email === 'string' && emailRegex.test(email);
}

// Omitir los campos que son null, undefined o strings vacíos
function omitEmptyFields(data) {
  const cleanedData = {};
  for (const key in data) {
    const value = data[key];
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue !== '') {
          if (key === 'email' && !isValidEmail(trimmedValue)) {
            console.warn(`Advertencia: El email ${trimmedValue} no es válido y será omitido`);
          } else {
            cleanedData[key] = trimmedValue;
          }
        }
      } else {
        cleanedData[key] = value;
      }
    }
  }
  return cleanedData;
}

// Función para enviar datos a Strapi
async function sendToStrapi(data) {
  if (!validateRequiredFields(data)) {
    return;
  }

  // Preparamos los datos, asegurando que los campos opcionales estén presentes o como strings vacíos
  const validData = omitEmptyFields({
    idfromcsv: data.idfromcsv,
    name: data.name,
    description: data.description,
    website: data.website,
    email: data.email,
    phone: data.phone,
    description_en: data.description_en,
    description_ar: data.description_ar,
  });

  console.log('Datos a enviar:', JSON.stringify(validData, null, 2));
  

  try {
    // Hacemos la petición POST a la API de Strapi
    const response = await axios.post(
      `${STRAPI_URL}/api/${CONTENT_TYPE}`,
      { data: validData },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    console.log(`Datos enviados con éxito. ID: ${response.data.data.id}`);
  } catch (error) {
    console.error('Error al enviar datos a Strapi:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Función principal para leer los datos y enviarlos a Strapi
async function main() {
  try {
    let data;

    // Verificar si el archivo es CSV o JSON
    if (FILE_PATH.endsWith('.csv')) {
      data = await readCSV(FILE_PATH);
    } else if (FILE_PATH.endsWith('.json')) {
      data = await readJSON(FILE_PATH);
    } else {
      throw new Error('Formato de archivo no soportado. Use CSV o JSON.');
    }

    let i = 0;
    // Enviar cada registro a Strapi
    for (const item of data) {
      await sendToStrapi(item);
      i++;
      console.log(`Registro ${i} procesado.`);
    }

    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
