// src/App.tsx
import * as React from "react";
import {
  Admin,
  Resource,
  Layout,
  LayoutProps,
  CustomRoutes,
} from "react-admin";
import { Route } from "react-router-dom";
import dataProvider from "./dataProvider";
import { PaintingList, PaintingCreate, PaintingEdit } from "./paintings";
import { ProjektList, ProjektCreate, ProjektEdit } from "./projekty";
import { VystavaList, VystavaCreate, VystavaEdit } from "./vystavy";
import { ReorderList } from "./ReorderList";
import { MyAppBar } from "./MyAppBar";
import PaletteIcon from "@mui/icons-material/Palette";
import BookIcon from "@mui/icons-material/Book";
import EventIcon from "@mui/icons-material/Event";

const MyLayout: React.FC<LayoutProps> = (props) => (
  <Layout {...props} appBar={MyAppBar} />
);

const App: React.FC = () => (
  <Admin dataProvider={dataProvider} layout={MyLayout}>
    <Resource
      name="paintings"
      list={PaintingList}
      create={PaintingCreate}
      edit={PaintingEdit}
      icon={PaletteIcon}
    />
    <Resource
      name="projekty"
      list={ProjektList}
      create={ProjektCreate}
      edit={ProjektEdit}
      icon={BookIcon}
    />
    <Resource
      name="vystavy"
      list={VystavaList}
      create={VystavaCreate}
      edit={VystavaEdit}
      icon={EventIcon}
    />

    {/* Add custom routes for the reorder pages */}
    <CustomRoutes>
      <Route
        path="/paintings/reorder"
        element={<ReorderList resource="paintings" />}
      />
      <Route
        path="/projekty/reorder"
        element={<ReorderList resource="projekty" />}
      />
      <Route
        path="/vystavy/reorder"
        element={<ReorderList resource="vystavy" />}
      />
    </CustomRoutes>
  </Admin>
);

export default App;
