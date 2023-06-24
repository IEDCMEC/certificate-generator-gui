import fs from "fs";
import csv from "csv-parser";
import Jimp from "jimp";
import JSZip from "jszip";
import multiparty from "multiparty";
import { saveAs } from "file-saver";

const uploadImage = async (req, res) => {
  const form = new multiparty.Form();
  const data = await new Promise((resolve, reject) => {
    form.parse(req, function (err, fields, files) {
      if (err) reject({ err });
      resolve({ fields, files });
    });
  });

  const generateCertificates = async () => {
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

            const zip = new JSZip();

            for (let i = 0; i < namesArray.length; i++) {
              const certificate = certificateImage.clone();

              const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
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
              zip.file(`${namesArray[i]}_${random}.jpg`, certificateBuffer);
            }

            const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
              "Content-Disposition",
              "attachment; filename=certificates.zip"
            );

            res.send(zipBuffer);
          } catch (error) {
            reject(`Error generating certificates: ${error}`);
          }
        });
    });
  };

  await generateCertificates();
  res.status(200).json({ success: true });
};

export default uploadImage;
export const config = {
  api: {
    bodyParser: false,
    responseLimit: "100mb",
  },
};
