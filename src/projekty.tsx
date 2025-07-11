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
import { ProjectRecord } from "./dataProvider";
import { ImageUploadInput } from "./ImageUploadInput";
import { ListActions } from "./ListActions"; // <-- Import the new component

// --- List View for Projects ---
export const ProjektList: React.FC<Omit<ListProps, "children">> = (props) => (
  <List<ProjectRecord>
    {...props}
    actions={<ListActions />} // <-- Add this actions prop
    sort={{ field: "order", order: "ASC" }} // <-- Default sort by order
    title="Projekty"
  >
    <Datagrid rowClick="edit">
      <TextField source="order" /> {/* <-- Display the order */}
      <TextField source="id" />
      <TextField source="date" label="Date" />
      <TextField source="title" label="Title" />
      <TextField source="image" label="Image Path" />
      <EditButton />
      <DeleteWithConfirmButton />
    </Datagrid>
  </List>
);

// --- Form for Create/Edit (Unchanged) ---
const ProjektForm: React.FC = () => (
  <SimpleForm>
    <TextInput source="id" disabled />
    <TextInput source="title" validate={required()} fullWidth label="Title" />
    <TextInput
      source="date"
      fullWidth
      label="Date (e.g., 'Prosinec 2021, Dobřany')"
    />
    <TextInput source="description" fullWidth multiline label="Description" />
    <ImageUploadInput source="image" resource="projekty" />
    <TextInput source="video_url" fullWidth label="Video Embed URL" />
    <ArrayInput source="links" label="Related Links">
      <SimpleFormIterator inline>
        <TextInput source="url" helperText={false} label="Link URL" />
        <TextInput source="text" helperText={false} label="Link Text" />
      </SimpleFormIterator>
    </ArrayInput>
  </SimpleForm>
);

// --- Create View for Projects (Unchanged) ---
export const ProjektCreate: React.FC<Omit<CreateProps, "children">> = (
  props,
) => (
  <Create<ProjectRecord> {...props} title="Create a New Project">
    <ProjektForm />
  </Create>
);

// --- Edit View for Projects (Unchanged) ---
export const ProjektEdit: React.FC<Omit<EditProps, "children">> = (props) => (
  <Edit<ProjectRecord> {...props} title="Edit Project">
    <ProjektForm />
  </Edit>
);
