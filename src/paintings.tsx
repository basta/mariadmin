// src/paintings.tsx
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
  useNotify,
  useRedirect,
  Toolbar,
  SaveButton,
  DeleteWithConfirmButton,
  ListProps, // Import specific props types
  CreateProps,
  EditProps,
  ToolbarProps,
  Identifier,
} from "react-admin";
import { PaintingRecord } from "./dataProvider"; // Import the record type

// --- List View ---
export const PaintingList: React.FC<Omit<ListProps, "children">> = (props) => (
  <List<PaintingRecord>
    {...props}
    sort={{ field: "id", order: "DESC" }}
    title="Paintings"
  >
    <Datagrid rowClick="edit">
      {" "}
      {/* Make rows clickable for editing */}
      <TextField source="id" sortable={true} />
      {/* ImageField uses the 'url' which is processed by dataProvider */}
      <ImageField
        source="url" // Ensure dataProvider modifies 'url' to be the full URL
        title="title"
        sx={{
          "& img": { maxWidth: 100, maxHeight: 100, objectFit: "contain" },
        }}
        label="Image"
      />
      <TextField source="title" />
      <BooleanField source="sold" />
      <TextField source="filename" label="Filename" />
      <EditButton />
      <DeleteWithConfirmButton />
    </Datagrid>
  </List>
);

// --- Create View ---
export const PaintingCreate: React.FC<Omit<CreateProps, "children">> = (
  props,
) => {
  const notify = useNotify();
  const redirect = useRedirect();

  // Define success handler type
  const onSuccess = (data: PaintingRecord) => {
    notify("Painting created successfully!", { type: "info", undoable: false });
    redirect("/paintings");
  };

  return (
    <Create<PaintingRecord>
      {...props}
      title="Add New Painting"
      mutationOptions={{ onSuccess }}
    >
      <SimpleForm>
        <TextInput source="title" validate={required()} fullWidth />
        <BooleanInput source="sold" defaultValue={false} />
        <ImageInput
          source="image"
          label="Painting Image"
          accept="image/*"
          validate={required()}
        >
          {/* This ImageField shows the preview */}
          <ImageField source="src" title="title" />
        </ImageInput>
      </SimpleForm>
    </Create>
  );
};

// --- Custom Toolbar for Edit View ---
const EditToolbar: React.FC<ToolbarProps> = (props) => (
  <Toolbar {...props}>
    <SaveButton />
    <DeleteWithConfirmButton mutationMode="pessimistic" />
  </Toolbar>
);

// --- Edit View ---
export const PaintingEdit: React.FC<Omit<EditProps, "children">> = (props) => {
  const notify = useNotify();
  const redirect = useRedirect();

  // Define success handler type
  const onSuccess = (data: PaintingRecord) => {
    notify("Painting updated successfully!", { type: "info", undoable: false });
    // Redirect back to the list after successful update
    redirect("/paintings");
  };

  return (
    <Edit<PaintingRecord>
      {...props}
      title="Edit Painting"
      mutationOptions={{ onSuccess }}
    >
      {/* The form only submits changed values by default */}
      <SimpleForm toolbar={<EditToolbar />}>
        <TextInput source="id" disabled />
        <TextInput source="title" validate={required()} fullWidth />
        <BooleanInput source="sold" />
        {/* Display the current image using the processed 'url' */}
        <ImageField
          source="url" // Ensure dataProvider modifies 'url' to be the full URL
          title="title"
          label="Current Image"
          sx={{
            "& .RaImageField-image": {
              display: "block",
              maxWidth: 300,
              maxHeight: 300,
              width: "auto",
              height: "auto",
              objectFit: "contain",
              margin: "0.5em 0",
            },
          }}
        />
        <TextField source="filename" label="Current Filename" disabled />
      </SimpleForm>
    </Edit>
  );
};
