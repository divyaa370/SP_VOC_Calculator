import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/signin");
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Log out
    </Button>
  );
}
