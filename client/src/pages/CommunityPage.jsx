import Navbar from "../components/Navbar";
import Community from "../components/Community";
import TravelGroups from "../components/TravelGroups";

export default function CommunityPage() {
  return (
    <div className="font-sans bg-gray-50 text-gray-900">
      <Navbar />
      <div className="pt-14">
        <Community />
      </div>
    </div>
  );
}
