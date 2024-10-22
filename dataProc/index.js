const fs = require("fs");
const axios = require("axios");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: `${__dirname}/config.env` });
const apptoken = process.env.SEATABLE_APP_TOKEN;

const config = {
  method: "get",
  url: "https://cloud.seatable.io/api/v2.1/dtable/app-access-token/",
  headers: {
    Accept: "application/json; charset=utf-8; indent=4",
    Authorization: `Token ${apptoken}`,
  },
};
const tableNames = [
  "organizaciones",
  "sedes",
  "colectivos",
  "areas",
  "macroareas"
];

//   params: {
//           table_name: tableName,
//           view_name: "Default View",
//         },


async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  return new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(filepath))
      .on('finish', () => resolve())
      .on('error', e => reject(e));
  });
}

async function main() {
  // first lets get token from api token https://api.seatable.io/reference/getbasetokenwithapitoken
  const config2 = await axios(config)
    .then(function (response) {
      const basetoken = response.data.access_token;
      const config2 = {
        method: "get",
        url: `https://cloud.seatable.io/dtable-server/api/v1/dtables/${response.data.dtable_uuid}/rows/`,

        headers: {
          Authorization: "Bearer " + basetoken,
        },
      };
      return config2;
    })
    .catch(function (error) {
      console.log(error);
    });

    const promisesList = []
  // https://api.seatable.io/reference/getrow
  // now let's get all rows from a table
  for (const tableName of tableNames) {
    console.log(`Getting ${tableName} rows...`);
    const p = await axios({
      ...config2,
      params: {
        table_name: tableName,
        view_name: "Default View",
      },
    })
      .then(async function (response) {
        const data = response.data;

        if (tableName === 'organizaciones') {
          for (let row of data.rows) {
            if (row.logo && row.logo.length > 0) {
              const logoUrl = row.logo[0];
              const filename = path.basename(logoUrl);
              const filepath = path.join(__dirname, 'logos', filename);

              if (!fs.existsSync(path.join(__dirname, 'logos'))) {
                fs.mkdirSync(path.join(__dirname, 'logos'));
              }

              await downloadImage(logoUrl, filepath);
              row.logo = [`/logos/${filename}`];
            }
          }
        }

        fs.writeFile(
          `./${tableName}.json`,
          JSON.stringify(response.data),
          "utf8",
          function (err) {
            if (err) {
              console.error(`Error saving ${tableName} JSON file:`, err);
            } else {
              console.log(`${tableName} JSON file has been saved.`);
            }
          }
        );
        console.log(response.data.rows.length + "rows saved to file.");
      })
      .catch(function (error) {});
      promisesList.push(p);
  }
  

  return Promise.all(promisesList);
}

main().then(() => console.log('All operations completed'));
