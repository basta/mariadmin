import * as React from "react";
// The 'useResourceContext' hook is imported from 'react-admin', not 'react-router-dom'
import { TopToolbar, useResourceContext, CreateButton } from "react-admin"; // <-- Import CreateButton
import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";

export const ListActions = () => {
  // This hook now correctly gets the resource name ('paintings', 'projekty', etc.)
  const resource = useResourceContext();
  return (
    <TopToolbar>
      <CreateButton /> {/* <-- Add the Create button back */}
      <Button
        component={Link}
        to={`/${resource}/reorder`} // This will now work correctly
        startIcon={<SortIcon />}
      >
        Edit Order
      </Button>
    </TopToolbar>

  );
};
