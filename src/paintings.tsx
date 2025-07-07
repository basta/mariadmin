import * as React from "react";
import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  ImageField,
  EditButton,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  ImageInput,
  Edit,
  required,
  DeleteWithConfirmButton,
  ListProps,
  CreateProps,
  EditProps,
} from "react-admin";
import { PaintingRecord } from "./dataProvider";
import { ListActions } from "./ListActions"; // <-- Import the new component

// --- List View ---
export const PaintingList: React.FC<Omit<ListProps, "children">> = (props) => (
  <List<PaintingRecord>
    {...props}
    actions={<ListActions />} // <-- Add this actions prop
    sort={{ field: "order", order: "ASC" }} // <-- Default sort by order
    title="Paintings"
  >
    <Datagrid rowClick="edit">
      <TextField source="order" /> {/* <-- Display the order */}
      <TextField source="id" />
      <ImageField
        source="url"
        title="title"
        sx={{
          "& img": { maxWidth: 100, maxHeight: 100, objectFit: "contain" },
        }}
        label="Image"
      />
      <TextField source="title" />
      <BooleanField source="sold" />
      <EditButton />
      <DeleteWithConfirmButton />
    </Datagrid>
  </List>
);

// --- Create View (Simplified: no 'order' input) ---
export const PaintingCreate: React.FC<Omit<CreateProps, "children">> = (
  props,
) => (
  <Create<PaintingRecord> {...props} title="Add New Painting">
    <SimpleForm>
      <TextInput source="title" validate={required()} fullWidth />
      <BooleanInput source="sold" defaultValue={false} />
      <ImageInput
        source="image"
        label="Painting Image"
        accept="image/*"
        validate={required()}
      >
        <ImageField source="src" title="title" />
      </ImageInput>
    </SimpleForm>
  </Create>
);

// --- Edit View (Refactored for JSON updates) ---
export const PaintingEdit: React.FC<Omit<EditProps, "children">> = (props) => (
  <Edit<PaintingRecord> {...props} title="Edit Painting">
    <SimpleForm>
      <TextInput source="id" disabled />
      <TextInput source="order" disabled />
      <TextInput source="title" validate={required()} fullWidth />
      <BooleanInput source="sold" />
      <ImageField
        source="url"
        title="title"
        label="Current Image"
        sx={{ "& .RaImageField-image": { maxWidth: 300, maxHeight: 300 } }}
      />
      <TextField source="filename" label="Current Filename" />
    </SimpleForm>
  </Edit>
);
