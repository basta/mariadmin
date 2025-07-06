// src/App.tsx
import * as React from "react";
import { Admin, Resource, Layout, LayoutProps } from "react-admin";
import dataProvider from "./dataProvider";
import { PaintingList, PaintingCreate, PaintingEdit } from "./paintings";
// --- Import new project components ---
import { ProjektList, ProjektCreate, ProjektEdit } from "./projekty";
// --- Import new exhibition components ---
import { VystavaList, VystavaCreate, VystavaEdit } from "./vystavy";
import { MyAppBar } from "./MyAppBar";

// --- Import Icons ---
import PaletteIcon from "@mui/icons-material/Palette";
import BookIcon from "@mui/icons-material/Book"; // Icon for projects
import EventIcon from "@mui/icons-material/Event"; // Icon for exhibitions

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
            recordRepresentation={(record) => `${record.title} (#${record.id})`}
        />
        {/* --- Add Project Resource --- */}
        <Resource
            name="projekty"
            list={ProjektList}
            create={ProjektCreate}
            edit={ProjektEdit}
            icon={BookIcon}
            recordRepresentation="title"
        />
        {/* --- Add Exhibition Resource --- */}
        <Resource
            name="vystavy"
            list={VystavaList}
            create={VystavaCreate}
            edit={VystavaEdit}
            icon={EventIcon}
            recordRepresentation="title"
        />
    </Admin>
);

export default App;