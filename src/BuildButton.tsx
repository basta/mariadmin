// src/BuildButton.tsx
import * as React from "react";
import { Button } from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import { useDataProvider, useNotify, DataProvider } from "react-admin"; // Removed useRefresh as it wasn't used

// Define the expected response structure from triggerBuild if known
interface BuildResponse {
  message: string;
  // add other fields if the API returns more
}

// Define the shape of the DataProvider including the custom method
interface AppDataProvider extends DataProvider {
  triggerBuild: () => Promise<{ data: BuildResponse }>;
}

const BuildButton: React.FC = () => {
  // Explicitly type the dataProvider using the extended interface
  const dataProvider = useDataProvider<AppDataProvider>();
  const notify = useNotify();
  // const refresh = useRefresh(); // Uncomment if you need to refresh data view after build
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleClick = () => {
    setLoading(true);
    dataProvider
      .triggerBuild() // Call the custom method
      .then(({ data }) => {
        // Destructure data from the response
        notify(data.message || "Build triggered successfully.", {
          type: "info",
        });
        // refresh(); // Uncomment if you need to refresh data view
      })
      .catch((error: Error) => {
        // Catch errors
        notify(`Error: ${error.message || "Failed to trigger build"}`, {
          type: "warning",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Button
      variant="contained" // Added variant for better visibility
      color="primary"
      onClick={handleClick}
      disabled={loading}
      startIcon={<BuildIcon />}
      sx={{ ml: 1 }} // Add some margin if used in AppBar
    >
      Trigger Build
    </Button>
  );
};

export default BuildButton;
