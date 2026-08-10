import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/today" replace />;
  }

  return children;
};

export default AdminRoute;
