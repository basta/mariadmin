// src/vystavy.tsx
import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  Create,
  SimpleForm,
  TextInput,
  Edit,
  required,
  DeleteWithConfirmButton,
  ArrayInput,
  SimpleFormIterator,
  ListProps,
  CreateProps,
  EditProps,
} from "react-admin";
import { ExhibitionRecord } from "./dataProvider"; // Import the record type
import { ImageUploadInput } from "./ImageUploadInput"; // Import the new component

// --- List View for Exhibitions ---
export const VystavaList: React.FC<Omit<ListProps, "children">> = (props) => (
  <List<ExhibitionRecord>
    {...props}
    sort={{ field: "id", order: "DESC" }}
    title="Výstavy"
  >
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="date" label="Date" />
      <TextField source="title" label="Title" />
      <TextField source="image" label="Image Path" />
      <EditButton />
      <DeleteWithConfirmButton />
    </Datagrid>
  </List>
);

// --- Form for Create/Edit ---
const VystavaForm: React.FC = () => (
  <SimpleForm>
    <TextInput source="id" disabled />
    <TextInput source="title" validate={required()} fullWidth label="Title" />
    <TextInput source="date" fullWidth label="Date (e.g., '3. Srpna, 2024')" />

    {/* --- Replace TextInput with our new component --- */}
    <ImageUploadInput source="image" resource="vystavy" />

    <ArrayInput source="links" label="Related Links">
      <SimpleFormIterator inline>
        <TextInput source="url" helperText={false} label="Link URL" />
        <TextInput source="text" helperText={false} label="Link Text" />
      </SimpleFormIterator>
    </ArrayInput>
  </SimpleForm>
);

// --- Create View for Exhibitions ---
export const VystavaCreate: React.FC<Omit<CreateProps, "children">> = (
  props,
) => (
  <Create<ExhibitionRecord> {...props} title="Create a New Exhibition">
    <VystavaForm />
  </Create>
);

// --- Edit View for Exhibitions ---
export const VystavaEdit: React.FC<Omit<EditProps, "children">> = (props) => (
  <Edit<ExhibitionRecord> {...props} title="Edit Exhibition">
    <VystavaForm />
  </Edit>
);
