import { BrowserRouter as Router, Route, Routes,Navigate } from "react-router-dom";
import Login from './Components/Authentication/Login';
import Chat from './Components/Chat/Chat';

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = localStorage.getItem("token");
  return isAuthenticated?element:<Navigate to="/" />
};

function App() {
  return (
      <Router>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path="/chat" element={<ProtectedRoute element={<Chat />} />} />
        </Routes>
      </Router>
  );
}

export default App;
