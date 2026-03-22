import { Navigate } from "react-router-dom";

// MapView is deprecated — redirect to /explore
export default function MapView() {
  return <Navigate to="/explore?tab=events" replace />;
}
