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
import { ExhibitionRecord } from "./dataProvider";
import { ImageUploadInput } from './ImageUploadInput';
import { ListActions } from './ListActions'; // <-- Import the new component

// --- List View for Exhibitions ---
export const VystavaList: React.FC<Omit<ListProps, "children">> = (props) => (
    <List<ExhibitionRecord> 
        {...props} 
        actions={<ListActions />} // <-- Add this actions prop
        sort={{ field: "order", order: "ASC" }} // <-- Default sort by order
        title="Výstavy"
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
const VystavaForm: React.FC = () => (
    <SimpleForm>
        <TextInput source="id" disabled />
        <TextInput source="title" validate={required()} fullWidth label="Title" />
        <TextInput source="date" fullWidth label="Date (e.g., '3. Srpna, 2024')" />
        <ImageUploadInput source="image" resource="vystavy" />
        <ArrayInput source="links" label="Related Links">
            <SimpleFormIterator inline>
                <TextInput source="url" helperText={false} label="Link URL" />
                <TextInput source="text" helperText={false} label="Link Text" />
            </SimpleFormIterator>
        </ArrayInput>
    </SimpleForm>
);

// --- Create View for Exhibitions (Unchanged) ---
export const VystavaCreate: React.FC<Omit<CreateProps, "children">> = (props) => (
    <Create<ExhibitionRecord> {...props} title="Create a New Exhibition">
        <VystavaForm />
    </Create>
);

// --- Edit View for Exhibitions (Unchanged) ---
export const VystavaEdit: React.FC<Omit<EditProps, "children">> = (props) => (
    <Edit<ExhibitionRecord> {...props} title="Edit Exhibition">
        <VystavaForm />
    </Edit>
);