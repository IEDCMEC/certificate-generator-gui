import fs from "fs";
import csv from "csv-parser";
import Jimp from "jimp";
import { google } from "googleapis";
import multiparty from "multiparty";
import path from "path";
import stream from "stream";
// import axios from "axios";

const credentials = require("../../utils/credentials.json");
// const emailUrl =
//   "https://w2e9j471i2.execute-api.ap-south-1.amazonaws.com/dev/send-email";

// Extracts the file ID from the Google Drive share link
const getFileIdFromLink = (link) => {
  const regex = /\/drive\/folders\/([\w-]+)/;

  const match = link.match(regex);
  if (match) {
    return match[1];
  }
  return null;
};

const generateCertificates = async (data) => {
  const random = Math.floor(100 + Math.random() * 900);
  const namesArray = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(data.files.csvFile[0].path) // Access the uploaded CSV file path
      .pipe(csv())
      .on("data", (row) => {
        namesArray.push(row["Name"]);
      })
      .on("end", async () => {
        try {
          const certificateImage = await Jimp.read(
            data.files.certificateImage[0].path
          ); // Access the uploaded certificate image path

          const drive = google.drive({
            version: "v3",
            auth: new google.auth.GoogleAuth({
              credentials,
              scopes: ["https://www.googleapis.com/auth/drive"],
            }),
          });

          if (namesArray) {
            for (let i = 0; i < namesArray.length; i++) {
              const certificate = certificateImage.clone();

              const jimpFont = path.resolve("./public/fonts/poppins.fnt");
              const font = await Jimp.loadFont(jimpFont);
              const textWidth = Jimp.measureText(font, namesArray[i]);
              const xPos = (certificate.bitmap.width - textWidth) / 2;

              certificate.print(
                font,
                xPos,
                parseInt(data.fields.yPosition[0]),
                namesArray[i]
              );

              const certificateBuffer = await certificate.getBufferAsync(
                Jimp.MIME_JPEG
              );

              const readableStream = stream.Readable.from(certificateBuffer);

              console.log(`Generating certificate for ${namesArray[i]}...`);

              const folderId = getFileIdFromLink(data.fields.driveLink[0]);
              if (folderId) {
                // Upload the certificate image to Google Drive
                await drive.files.create({
                  requestBody: {
                    name: `${namesArray[i]}_${random}.jpg`,
                    mimeType: "image/jpeg",
                    parents: [folderId],
                  },
                  media: {
                    mimeType: "image/jpeg",
                    body: readableStream,
                  },
                });

                console.log(
                  `Certificate generated for ${namesArray[i]}_${random}.jpg`) 
              }
            }
          }
          resolve();
        } catch (error) {
          reject(`Error generating certificates: ${error}`);
        }
      });
  });
};

const sendSuccessResponse = (res) => {
  res.status(200).json({ success: true });
};

const processRequest = async (req, res) => {
  if (req.method === "POST") {
    const form = new multiparty.Form();
    const data = await new Promise((resolve, reject) => {
      form.parse(req, function (err, fields, files) {
        if (err) reject({ err });
        resolve({ fields, files });
      });
    });

    sendSuccessResponse(res);

    // Run certificate generation in the background
    generateCertificates(data)
      .then(async () => {
        // await axios.post(emailUrl, {
        //   toEmail: data.fields.email[0],
        //   subject: `Your certificate is ready!`,
        //   content:
        //     `Hi ${data.fields.email[0]},<br><br/>` +
        //     `Your certificate is ready. Please check your Google Drive folder.<br><br/>` +
        //     `<button style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block;">` +
        //     `<a href="${data.fields.driveLink[0]}" style="color: white; text-decoration: none;">` +
        //     `View Certificates` +
        //     `</a>` +
        //     `</button>` +
        //     `<br><br/>` +
        //     `Thanks,<br><br/>` +
        //     `Certificate Generator` +
        //     `<br><br/>` +
        //     `<strong>IEDC MEC</strong>` +
        //     `<br><br/>` +
        //     `P.S. This is an auto-generated email. Please do not reply to this email.`,
        // });
        console.log("Certificates generated successfully");
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    res.status(404).json({ success: false });
  }
};

export default processRequest;
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
