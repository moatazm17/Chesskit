import { FormControl, TextField, Button } from "@mui/material";
import { Icon } from "@iconify/react";
import React from "react";

interface Props {
  pgn: string;
  setPgn: (pgn: string) => void;
}

export default function GamePgnInput({ pgn, setPgn }: Props) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      setPgn(fileContent);
    };

    reader.readAsText(file);
  };

  return (
    <FormControl fullWidth>
      <TextField
        label="Enter PGN here..."
        variant="outlined"
        multiline
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        rows={8}
        sx={{ 
          mb: 2,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4ecdc4',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255,255,255,0.8)',
            '&.Mui-focused': {
              color: '#4ecdc4',
            },
          },
        }}
      />
      <Button
        variant="contained"
        component="label"
        startIcon={<Icon icon="material-symbols:upload" />}
        sx={{
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          '&:hover': {
            background: 'linear-gradient(45deg, #ff5252, #26a69a)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.3s ease'
        }}
      >
        Upload PGN File
        <input type="file" hidden accept=".pgn" onChange={handleFileChange} />
      </Button>
    </FormControl>
  );
}
