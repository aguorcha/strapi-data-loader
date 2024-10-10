// Función para leer un archivo JSON
const fs = require("fs").promises;


async function readJSON(filePath) {
  const content = await fs.readFile(filePath, { encoding: "utf-8" });
  const parsedContent = JSON.parse(content);
  if (parsedContent.rows && Array.isArray(parsedContent.rows)) {
    return parsedContent.rows;
  }
  throw new Error(
    `El archivo JSON ${filePath} debe contener un array de objetos en la propiedad "rows"`
  );
}

// Validar si los campos obligatorios están presentes
function validateRequiredFields(data) {
  const requiredFields = ["id", "nombre", "descripcion_general"];

  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(
        `Error: El campo ${field} es obligatorio y está vacío para el id ${
          data.id || "desconocido"
        }`
      );
      return false;
    }
  }
  return true;
}

// Validación de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && typeof email === "string" && emailRegex.test(email);
}

// Omitir los campos que son null, undefined o strings vacíos, y los que empiezan por '_'
function omitEmptyFields(data) {
  const cleanedData = {};
  for (const key in data) {
    if (!key.startsWith("_")) {
      const value = data[key];
      if (value !== null && value !== undefined && value !== "") {
        if (typeof value === "string") {
          const trimmedValue = value.trim();
          if (trimmedValue !== "") {
            if (key === "email_general" && !isValidEmail(trimmedValue)) {
              console.warn(
                `Advertencia: El email ${trimmedValue} no es válido y será omitido`
              );
            } else {
              cleanedData[key] = trimmedValue;
            }
          }
        } else {
          cleanedData[key] = value;
        }
      }
    }
  }
  return cleanedData;
}


module.exports = {
    readJSON,
    validateRequiredFields,
    isValidEmail,
    omitEmptyFields
    };