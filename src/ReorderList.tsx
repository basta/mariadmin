import * as React from "react";
import {
  useGetList,
  useNotify,
  useRefresh,
  Title,
  RaRecord,
  Identifier,
  useDataProvider,
} from "react-admin";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  List,
  ListItemText,
  Avatar,
  Button,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import { AppDataProvider } from "./dataProvider";

const SortableItem = ({ record }: { record: RaRecord }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: record.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{ display: "flex", alignItems: "center", p: 1, mb: 1 }}
      elevation={isDragging ? 3 : 1}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: "grab", touchAction: "none", display: "flex", mr: 2 }}
      >
        <DragHandleIcon />
      </Box>
      <Avatar
        src={
          record.url ||
          (record.image ? `http://localhost:8000/${record.image}` : undefined)
        }
        sx={{ mr: 2 }}
      />
      <ListItemText primary={record.title} secondary={`ID: ${record.id}`} />
    </Paper>
  );
};

export const ReorderList = ({ resource }: { resource: string }) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider<AppDataProvider>();
  const [isSaving, setIsSaving] = React.useState(false);

  // 1. Fetch the data in the default ascending order (0, 1, 2, ...)
  const { data, isLoading, error } = useGetList(resource, {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "order", order: "ASC" },
  });

  const [items, setItems] = React.useState<RaRecord[]>([]);

  // 2. This useEffect hook will now reverse the data before setting it as the initial state.
  React.useEffect(() => {
    if (data) {
      // Create a reversed copy of the fetched data array for display.
      const reversedData = [...data].reverse();
      setItems(reversedData);
    }
  }, [data]); // This hook runs only when the data is first fetched.

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id,
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // The 'items' array is in the visual order (e.g., [C, B, A]).
    // The backend expects the storage order (e.g., [A, B, C]).
    // So, we reverse the array again before extracting the IDs.
    const idsInStorageOrder = [...items].reverse().map((item) => item.id);

    dataProvider
      .reorder(resource, { ids: idsInStorageOrder }) // Send the correctly ordered IDs
      .then(() => {
        notify("Order saved successfully", { type: "info" });
        // After refresh, the useEffect will correctly re-reverse the display,
        // maintaining a stable UI for the user.
        refresh();
      })
      .catch((e) => notify(`Error: ${e.message}`, { type: "warning" }))
      .finally(() => setIsSaving(false));
  };

  if (isLoading) return <CircularProgress />;
  if (error) return <p>Error loading data.</p>;

  return (
    <Card>
      <Title
        title={`Reorder ${resource.charAt(0).toUpperCase() + resource.slice(1)}`}
      />
      <CardContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Drag and drop items to change their display order, then click save.
          Highest order is at the top.
        </Typography>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <List>
              {/* This will now render the reversed list */}
              {items.map((record) => (
                <SortableItem key={record.id} record={record} />
              ))}
            </List>
          </SortableContext>
        </DndContext>
        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <CircularProgress size={24} /> : "Save New Order"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
