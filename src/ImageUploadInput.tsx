// src/ImageUploadInput.tsx
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { useDataProvider, useNotify, Labeled } from "react-admin";
import { Box, Typography, Link, Button, CircularProgress } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { AppDataProvider } from "./dataProvider";

interface Props {
  source: string; // The field to update with the path, e.g., 'image'
  resource: string; // The API resource for uploading, e.g., 'projekty'
}

export const ImageUploadInput: React.FC<Props> = ({ source, resource }) => {
  const { watch, setValue } = useFormContext();
  const dataProvider = useDataProvider<AppDataProvider>();
  const notify = useNotify();

  const [loading, setLoading] = React.useState(false);

  // Get the current path from the form's data
  const imagePath = watch(source);

  // Create a ref to the hidden file input element
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // This function is triggered when the user selects a file
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    try {
      // Call the dataProvider with the selected file
      const { data } = await dataProvider.uploadImage(resource, { file: file });

      // On success, update the actual 'image' field in the form
      setValue(source, data.path, { shouldDirty: true });
      notify("Image uploaded and path set successfully", { type: "info" });
    } catch (error: any) {
      notify(`Error: ${error.message}`, { type: "warning" });
    } finally {
      setLoading(false);
    }
  };

  // This function is called when the visible button is clicked
  const handleButtonClick = () => {
    // Programmatically click the hidden file input
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ my: 2 }}>
      <Labeled label="Image">
        <Box>
          {/* Display the current image path if it exists */}
          {imagePath ? (
            <Typography variant="body2" sx={{ my: 1 }}>
              Current Path:{" "}
              <Link
                href={`http://localhost:8000/${imagePath}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {imagePath}
              </Link>
            </Typography>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ my: 1 }}>
              No image uploaded yet.
            </Typography>
          )}

          {/* The hidden file input that does the real work */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* The visible button the user interacts with */}
          <Button
            variant="contained"
            onClick={handleButtonClick}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <UploadFileIcon />
              )
            }
          >
            {loading ? "Uploading..." : "Choose & Upload Image"}
          </Button>
        </Box>
      </Labeled>
    </Box>
  );
};
