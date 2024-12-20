// App.js
import React from 'react';
import { CssBaseline, Container } from '@mui/material';
import MusicSheet from './MusicSheet';

function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="md">
        <MusicSheet />
      </Container>
    </React.Fragment>
  );
}

export default App;
