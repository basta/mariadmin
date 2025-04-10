// src/MyAppBar.tsx
import * as React from "react";
import { AppBar, TitlePortal, AppBarProps } from "react-admin";
import { Box } from "@mui/material";
import BuildButton from "./BuildButton";

// Use AppBarProps for type safety
export const MyAppBar: React.FC<AppBarProps> = (props) => (
  // Spread props to ensure all AppBar functionalities are passed down
  <AppBar {...props} color="secondary" elevation={1}>
    {" "}
    {/* Added color and elevation */}
    <TitlePortal />
    <Box flex="1" /> {/* Spacer */}
    <BuildButton /> {/* Add the button */}
  </AppBar>
);
