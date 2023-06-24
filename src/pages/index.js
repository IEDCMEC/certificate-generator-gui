import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { saveAs } from "file-saver";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [xPosition, setXPosition] = useState(null);
  const [yPosition, setYPosition] = useState(null);
  const [csvFile, setCSVFile] = useState(null);

  const onImageDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === "image/png" || file.type === "image/jpeg") {
        setImage(file);
        setImageURL(URL.createObjectURL(file));
      }
    }
  };

  const onCSVDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      if (
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setCSVFile(file);
      }
    }
  };

  const { getRootProps: getRootPropsImage, getInputProps: getInputPropsImage } =
    useDropzone({ onDrop: onImageDrop });

  const { getRootProps: getRootPropsCSV, getInputProps: getInputPropsCSV } =
    useDropzone({ onDrop: onCSVDrop });

  const handleImageClick = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    const imageElement = event.target;
    const imageRect = imageElement.getBoundingClientRect();

    const textWidth = 200; // Replace with the actual text width
    const x = (imageElement.offsetWidth - textWidth) / 2;

    setXPosition(x);
    setYPosition(offsetY + imageRect.top);
  };

  const generateCertificates = async () => {
    const formData = new FormData();

    formData.append("xPosition", xPosition);
    formData.append("yPosition", yPosition);
    formData.append("csvFile", csvFile);
    formData.append("certificateImage", image);

    try {
      const response = await axios.post("/api/generateCertificate", formData, {
        responseType: "blob",
      });
      const file = new Blob([response.data], { type: "application/zip" });
      saveAs(file, "certificates.zip");
    } catch (error) {
      console.error("Error generating certificates:", error);
    }
  };
  return (
    <div>
      <div {...getRootPropsImage()} style={dropzoneStyles}>
        <input {...getInputPropsImage()} />
        <p>Drag and drop an image file here, or click to select a file.</p>
      </div>
      {image && (
        <div style={imageContainerStyles}>
          <img
            src={imageURL}
            alt="Uploaded"
            style={imageStyles}
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
      )}

      <div {...getRootPropsCSV()} style={dropzoneStyles}>
        <input {...getInputPropsCSV()} />
        <p>Drag and drop a CSV file here, or click to select a file.</p>
      </div>

      <input
        type="number"
        placeholder="Enter Y-coordinate"
        value={yPosition !== null ? yPosition : ""}
        onChange={(e) => setYPosition(parseInt(e.target.value))}
      />

      <button onClick={() => setYPosition(null)}>Reset Y-coordinate</button>

      <button onClick={generateCertificates}>Generate Certificates</button>
    </div>
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
