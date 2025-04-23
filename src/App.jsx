/*
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; 
import CreateRoom from './pages/create-room';
import JoinRoom from './pages/join-room';
*/
import TypingTest from './components/typing/typing';

/*
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/CreateRoom" element={<CreateRoom />} />
      <Route path="/JoinRoom" element={<JoinRoom />} />
      <Route path="/game/:roomCode" element={<Game />} />
    </Routes>
  );
}
*/

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
      <TypingTest />
    </div>
  );
}

export default App;


