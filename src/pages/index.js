import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import axios from "axios";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import JSZip from "jszip";

function App() {
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [xPosition, setXPosition] = useState(null);
  const [yPosition, setYPosition] = useState(null);
  const [csvFile, setCSVFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const imageRef = useRef(null);

  useEffect(() => {
    if (image) {
      const imageElement = imageRef.current;
      const imageRect = imageElement.getBoundingClientRect();

      const textWidth = 200; // Replace with the actual text width

      const x = (imageRect.width - textWidth) / 2;
      const y = imageRect.height / 2;

      setXPosition(x);
      setYPosition(y);
    }
  }, [image]);

  const onImageDrop = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === "image/png" || file.type === "image/jpeg") {
        setImage(file);
        setImageURL(URL.createObjectURL(file));
      }
    }
  };

  const onCSVDrop = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];

      if (
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel"
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvData = event.target.result;
          const parsedData = Papa.parse(csvData);
          const rows = parsedData.data;
          const header = rows[0];
          const dataRows = rows.slice(1);

          setCSVFile({ file, header, data: dataRows });
          setRowCount(dataRows?.length); // Set the row count excluding the header
        };
        reader.readAsText(file);
      }
    }
  };

  const { getRootProps: getRootPropsImage, getInputProps: getInputPropsImage } =
    useDropzone({ onDrop: onImageDrop });

  const { getRootProps: getRootPropsCSV, getInputProps: getInputPropsCSV } =
    useDropzone({ onDrop: onCSVDrop });

  const zipFiles = (blobs) => {
    const zip = new JSZip();

    // Add each blob to the zip
    blobs.forEach((blob) => {
      zip.file(blob.name, blob.data);
    });

    // Generate the zip file asynchronously
    zip.generateAsync({ type: "blob" }).then((content) => {
      // Save the zip file using the saveAs function
      saveAs(content, "files.zip");
    });
  };

  const handleImageClick = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const imageElement = imageRef.current;
    const imageRect = imageElement.getBoundingClientRect();

    const textWidth = 200; // Replace with the actual text width

    let x = offsetX + imageRect.left - textWidth / 2;
    let y = offsetY + imageRect.top;

    // Adjust x position to stay within image boundaries
    if (x < 0) {
      x = 0;
    } else if (x > imageRect.width - textWidth) {
      x = imageRect.width - textWidth;
    }

    // Adjust y position to stay within image boundaries
    if (y < 0) {
      y = 0;
    } else if (y > imageRect.height) {
      y = imageRect.height;
    }

    setXPosition(x);
    setYPosition(y);
  };

  const generateCertificates = async () => {
    if (!image) {
      toast.error("Please upload an image");
      return;
    }
    if (!csvFile) {
      toast.error("Please upload a CSV file");
      return;
    }

    if (xPosition === null || yPosition === null) {
      toast.error("Please select a position for the text");
      return;
    }

    toast.success(`Generating certificates...`);
    const formData = new FormData();

    formData.append("xPosition", xPosition);
    formData.append("yPosition", yPosition);
    formData.append("certificateImage", image);

    try {
      setIsLoading(true);
      const { header, data } = csvFile;
      const dataRows = data.map((row) => row.join(","));
      const batchSize = 20;
      const batches = [];

      if (dataRows && dataRows?.length > 0) {
        // loop code here
        for (let i = 0; i < dataRows?.length; i += batchSize) {
          const batch = dataRows.slice(i, i + batchSize);
          if(batch.length===0) break;
          batch.unshift(header.join(",")); // Add the header to the beginning of the batch
          console.log("batch", batch);
          batches.push(batch);
        }
      } else {
        toast.error(`Error generating certificates`);
        return;
      }

      const requests = batches.map((batch) => {
        const batchData = batch.join("\n");
        formData.set("csvFile", new Blob([batchData], { type: "text/csv" }));

        return axios.post("/api/generateCertificate", formData, {
          responseType: "blob",
        });
      });

      const responses = await Promise.all(requests);

      const zipBlobs = [];

      if (responses && responses?.length > 0) {
        for (let i = 0; i < responses?.length; i++) {
          const zipData = await responses[i].data;
          const blob = new Blob([zipData], { type: "application/zip" });
          const fileName = `batch_${i + 1}.zip`;
          zipBlobs.push({ name: fileName, data: blob });
        }
      } else {
        toast.error(`Error generating certificates`);
        return;
      }

      // Zip the blobs
      zipFiles(zipBlobs);
      setIsLoading(false);
      toast.success(`Certificates generated successfully!`);
    } catch (error) {
      setIsLoading(false);
      toast.error(`Error generating certificates`);
      console.error("Error generating certificates:", error);
    }
  };

  return (
    <>
      <div className="container">
        <h1 className="heading">Certificate Generator</h1>
        {isLoading && (
          <div className="overlay">
            <div className="loader"></div>
          </div>
        )}
        <div {...getRootPropsImage()} style={dropzoneStyles}>
          <input {...getInputPropsImage()} />
          <p>Drag and drop an image file here, or click to select a file.</p>
        </div>
        <br />
        {image && (
          <>
            <div style={imageContainerStyles}>
              <img
                id="uploaded-image"
                src={imageURL}
                alt="Uploaded"
                style={imageStyles}
                ref={imageRef}
                onClick={handleImageClick}
              />
              {xPosition !== null && yPosition !== null && (
                <div
                  style={{
                    position: "absolute",
                    left: xPosition,
                    top: yPosition,
                    background: "rgba(255, 0, 0, 0.5)",
                    width: "200px",
                    height: "50px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  Name of the Person
                </div>
              )}
            </div>
            <br />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <input
                type="number"
                placeholder="Enter Y-coordinate"
                value={yPosition !== null ? yPosition : ""}
                onChange={(e) => setYPosition(parseInt(e.target.value))}
              />

              <button
                onClick={() => setYPosition(imageRef.current.offsetHeight / 2)}
              >
                Reset Y-coordinate
              </button>
            </div>
            <br />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => {
                  const imageElement = imageRef.current;
                  const textWidth = 200; // Replace with the actual text width
                  const x = (imageElement.offsetWidth - textWidth) / 2;
                  setXPosition(x);
                }}
              >
                Center X-coordinate
              </button>
            </div>
          </>
        )}
        <br />
        {csvFile ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <p>CSV File: {csvFile.name}</p>
            <button onClick={() => saveAs(csvFile, csvFile.name)}>
              View/Download
            </button>
          </div>
        ) : (
          <div {...getRootPropsCSV()} style={dropzoneStyles}>
            <input {...getInputPropsCSV()} />

            <p>Drag and drop a CSV file here, or click to select a file.</p>
          </div>
        )}
        <br />
        <button
          onClick={generateCertificates}
          style={{
            alignSelf: "center",
          }}
        >
          Generate Certificates
        </button>
        <footer className="footer">Made with ❤️ IEDC MEC 2023</footer>
      </div>
    </>
  );
}

const dropzoneStyles = {
  border: "2px dashed #ccc",
  borderRadius: "4px",
  padding: "20px",
  textAlign: "center",
  cursor: "pointer",
};

const imageContainerStyles = {
  position: "relative",
};

const imageStyles = {
  maxWidth: "100%",
  height: "auto",
};

export default App;
