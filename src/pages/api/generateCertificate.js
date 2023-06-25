import fs from "fs";
import csv from "csv-parser";
import Jimp from "jimp";
import JSZip from "jszip";
import multiparty from "multiparty";
import path from "path";

const uploadImage = async (req, res) => {
  if (req.method === "POST") {
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
              console.log("Started rowId", data.fields.rowId[0]);
              const certificateImage = await Jimp.read(
                data.files.certificateImage[0].path
              ); // Access the uploaded certificate image path

              const zip = new JSZip();

              if (namesArray?.length > 0) {
                for (let i = 0; i < namesArray?.length; i++) {
                  const certificate = certificateImage.clone();

                  // const font = await Jimp.loadFont("public/fonts/poppins.fnt");
                  const jimpFont = path.resolve("./public/fonts/poppins.fnt");
                  path.resolve("./public/fonts/poppins.png");

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
                  zip.file(`${namesArray[i]}_${random}.jpg`, certificateBuffer);
                }
              }

              const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

              res.setHeader("Content-Type", "application/zip");
              res.setHeader(
                "Content-Disposition",
                "attachment; filename=certificates.zip"
              );
              console.log("Finished rowId", data.fields.rowId[0]);
              res.send(zipBuffer);
            } catch (error) {
              reject(`Error generating certificates: ${error}`);
            }
          });
      });
    };

    await generateCertificates();
    res.status(200).json({ success: true });
  } else res.status(404).json({ success: false });
};

export default uploadImage;
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
