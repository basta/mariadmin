// src/App.tsx
import * as React from "react";
import { Admin, Resource, Layout, LayoutProps } from "react-admin";
import dataProvider from "./dataProvider"; // Import the TS data provider
import { PaintingList, PaintingCreate, PaintingEdit } from "./paintings"; // Import TSX components
import { MyAppBar } from "./MyAppBar"; // Import TSX AppBar
import PaletteIcon from "@mui/icons-material/Palette"; // Icon for paintings

// Optional: Custom Layout Component typed with LayoutProps
const MyLayout: React.FC<LayoutProps> = (props) => (
  <Layout {...props} appBar={MyAppBar} />
);

const App: React.FC = () => (
  <Admin
    dataProvider={dataProvider}
    layout={MyLayout} // Use custom typed layout
  >
    <Resource
      name="paintings" // Matches the API endpoint resource name
      list={PaintingList}
      create={PaintingCreate}
      edit={PaintingEdit}
      icon={PaletteIcon} // Assign an icon to the resource in the menu
      recordRepresentation={(record) => `${record.title} (#${record.id})`} // More descriptive representation
    />
  </Admin>
);

export default App;
