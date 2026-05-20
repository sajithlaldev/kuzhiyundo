"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Polyline,
  Popup,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { db, loginWithGoogle, logout } from "../lib/firebase";
import { fetchWithAppCheck } from "../lib/appcheck-fetch";
import { initClarity } from "../lib/clarity";
import { getConstituency } from "../lib/constituency";
import { useAuthStore } from "../lib/store";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import { decode } from "@googlemaps/polyline-codec";
import {
  Navigation,
  Plus,
  LogOut,
  CheckCircle,
  MapPinIcon,
  Trash2,
  Heart,
  Camera,
  X,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Search,
  Share2,
  Link,
  Copy,
  Bug,
  ExternalLink,
} from "lucide-react";

// Fix default marker icon issues in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getColor = (severity?: string) => {
  switch (severity) {
    case "high":
      return "#ff003c";
    case "medium":
      return "#ff9900";
    case "low":
    default:
      return "#00f0ff";
  }
};

const redMarkerIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-4 h-4 bg-[#00f0ff] rounded-full border border-[#00f0ff]/50 shadow-[0_0_15px_#00f0ff] relative -left-2 -top-2"></div>`,
  iconSize: [0, 0],
});

export default function LeafletPotholeMap() {
  const [reports, setReports] = useState<any[]>([]);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Reporting state
  const [reportingMode, setReportingMode] = useState(false);
  const [reportingSeverity, setReportingSeverity] = useState<
    "low" | "medium" | "high"
  >("low");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentPathEncoded, setCurrentPathEncoded] = useState<string | null>(
    null,
  );
  const [pointsConfirmed, setPointsConfirmed] = useState(false);

  useEffect(() => { initClarity(); }, []);

  // Keep --app-height in sync with the actual visible viewport (excludes Chrome URL bar,
  // keyboard, and any other browser chrome). Falls back to window.innerHeight.
  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, [setUser]);

  const deepLinkHandled = useRef(false);

  useEffect(() => {
    const q = query(collection(db, "potholes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(data);
        if (!deepLinkHandled.current) {
          const params = new URLSearchParams(window.location.search);
          const id = params.get("id");
          if (id && data.some((r) => r.id === id)) {
            deepLinkHandled.current = true;
            setPendingDeepLinkId(id);
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
      },
      (error) => {
        console.error("Firestore Error: ", error);
      },
    );
    return () => unsubscribe();
  }, []);

  const cancelReporting = () => {
    setReportingMode(false);
    setOrigin(null);
    setDestination(null);
    setCurrentPathEncoded(null);
    setPointsConfirmed(false);
  };

  return (
    <div className="relative w-full h-app bg-neutral-900 overflow-hidden">
      <MapContainer
        center={[10.8505, 76.2711]}
        zoom={7}
        style={{ width: "100%", height: "100%", background: "#0f172a" }}
        attributionControl={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapEventsHandler
          reportingMode={reportingMode}
          origin={origin}
          destination={destination}
          pointsConfirmed={pointsConfirmed}
          setOrigin={(pos) => { setOrigin(pos); setDestination(null); setCurrentPathEncoded(null); setPointsConfirmed(false); }}
          setDestination={setDestination}
        />

        {/* Existing Reports */}
        <RenderReports reports={reports} detailReportId={detailReportId} setDetailReportId={setDetailReportId} pendingDeepLinkId={pendingDeepLinkId} setPendingDeepLinkId={setPendingDeepLinkId} />

        {/* Current Reporting Route — only after user confirms both points */}
        {reportingMode && origin && destination && (
          <RouteDisplay
            origin={origin}
            destination={destination}
            severity={reportingSeverity}
            onRouteFound={(encodedPath) => setCurrentPathEncoded(encodedPath)}
          />
        )}

        {/* Markers while picking points */}
        {reportingMode && origin && !pointsConfirmed && (
          <Marker position={origin} icon={redMarkerIcon} />
        )}
        {reportingMode && destination && !pointsConfirmed && (
          <Marker position={destination} icon={redMarkerIcon} />
        )}

        <ReportingOverlay
          reportsCount={reports.length}
          reportingMode={reportingMode}
          setReportingMode={setReportingMode}
          origin={origin}
          destination={destination}
          pointsConfirmed={pointsConfirmed}
          onConfirmPoints={() => setPointsConfirmed(true)}
          currentPathEncoded={currentPathEncoded}
          severity={reportingSeverity}
          setSeverity={setReportingSeverity}
          onCancel={cancelReporting}
        />

        <MapSearch />
      </MapContainer>
      <ReportsMarquee reports={reports} />
    </div>
  );
}

function ReportsMarquee({ reports }: { reports: any[] }) {
  if (!reports || reports.length === 0) return null;
  const latestReports = reports.slice(0, 5);

  const MarqueeItem = ({ report }: { report: any }) => (
    <div className="flex items-center shrink-0 whitespace-nowrap gap-2 mx-8 text-cyan-400 text-[10px] uppercase tracking-widest">
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: getColor(report.severity),
          boxShadow: `0 0 5px ${getColor(report.severity)}`,
        }}
      ></span>
      <span className="font-bold truncate max-w-[200px]">
        {report.address || "Unknown Location"}
      </span>
      <span className="text-cyan-500/50">
        (
        {new Date(
          report.createdAt?.toDate?.() || report.createdAt || Date.now(),
        ).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
        )
      </span>
    </div>
  );

  return (
    <div className="absolute bottom-0 left-0 w-full bg-black/90 border-t border-cyan-500/50 pt-2.5 z-[2000] overflow-hidden font-mono flex pointer-events-none" style={{ paddingBottom: "max(0.625rem, var(--sab))" }}>
      <div className="flex animate-marquee shrink-0 items-center justify-around min-w-full">
        {latestReports.map((report) => (
          <MarqueeItem key={`mq1-${report.id}`} report={report} />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex animate-marquee shrink-0 items-center justify-around min-w-full"
      >
        {latestReports.map((report) => (
          <MarqueeItem key={`mq2-${report.id}`} report={report} />
        ))}
      </div>
    </div>
  );
}

function MapEventsHandler({
  reportingMode,
  origin,
  destination,
  pointsConfirmed,
  setOrigin,
  setDestination,
}: {
  reportingMode: boolean;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  pointsConfirmed: boolean;
  setOrigin: (pos: { lat: number; lng: number }) => void;
  setDestination: (pos: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      if (!reportingMode || pointsConfirmed) return;
      if (!origin) {
        setOrigin(e.latlng);
      } else if (!destination) {
        setDestination(e.latlng);
      } else {
        // Both points set but not confirmed — restart with new origin
        setOrigin(e.latlng);
      }
    },
  });
  return null;
}

function RouteDisplay({
  origin,
  destination,
  onRouteFound,
  severity,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  onRouteFound: (encoded: string) => void;
  severity: "low" | "medium" | "high";
}) {
  const map = useMap();
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);

  useEffect(() => {
    async function fetchRoute() {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline`,
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const encoded = data.routes[0].geometry;
          const decoded = decode(encoded).map(
            ([lat, lng]) => [lat, lng] as [number, number],
          );
          setRoutePath(decoded);
          onRouteFound(encoded);

          if (decoded.length > 0) {
            const bounds = L.latLngBounds(
              decoded.map((p) => L.latLng(p[0], p[1])),
            );
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.5 });
          }
        }
      } catch (err) {
        console.error("Failed to fetch route from OSRM", err);
      }
    }
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, map]); // Removed onRouteFound to prevent effect loops if it changes identity

  if (!routePath) {
    return <Marker position={origin} icon={redMarkerIcon} />;
  }

  return (
    <Polyline
      positions={routePath}
      pathOptions={{
        className:
          severity === "high"
            ? "animated-polyline-high border"
            : "animated-polyline border",
        color: getColor(severity),
        weight: severity === "high" ? 6 : 4,
        opacity: 1,
      }}
    />
  );
}

function RenderReports({ reports, detailReportId, setDetailReportId, pendingDeepLinkId, setPendingDeepLinkId }: { reports: any[]; detailReportId: string | null; setDetailReportId: (id: string | null) => void; pendingDeepLinkId: string | null; setPendingDeepLinkId: (id: string | null) => void }) {
  const user = useAuthStore((state) => state.user);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSeverity, setEditSeverity] = useState<"low" | "medium" | "high">(
    "low",
  );
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [constituencyMap, setConstituencyMap] = useState<Record<string, any>>({});
  const [showSignInVotePrompt, setShowSignInVotePrompt] = useState(false);
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    if (detailReportId) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [detailReportId, map]);

  useEffect(() => {
    if (!pendingDeepLinkId) return;
    const report = reports.find((r) => r.id === pendingDeepLinkId);
    if (!report) return;
    const openPopup = () => {
      setDetailReportId(pendingDeepLinkId);
      setPendingDeepLinkId(null);
    };
    if (report.encodedPath) {
      const path = decode(report.encodedPath) as [number, number][];
      const bounds = L.latLngBounds(path);
      map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
      map.once("moveend", openPopup);
    } else {
      openPopup();
    }
  }, [pendingDeepLinkId]);

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
    popupclose() {
      setEditingId(null);
      setDeletingId(null);
    },
  });

  const fetchConstituency = async (report: any) => {
    if (report.acName || constituencyMap[report.id] !== undefined) return;
    if (!report.encodedPath) return;
    try {
      const { decode } = await import("@googlemaps/polyline-codec");
      const path = decode(report.encodedPath);
      if (!path.length) return;
      const [lat, lng] = path[0];
      const info = await getConstituency(lat, lng);
      setConstituencyMap((prev) => ({ ...prev, [report.id]: info }));
    } catch { }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "potholes", id));
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setEditImageUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSavingEdit(true);
    try {
      const updates: any = {
        severity: editSeverity,
      };
      if (editNotes.trim()) {
        updates.notes = editNotes.trim();
      } else {
        updates.notes = deleteField();
      }
      if (editImageUrl) {
        updates.imageUrl = editImageUrl;
      } else {
        updates.imageUrl = deleteField();
      }
      await updateDoc(doc(db, "potholes", id), updates);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleVote = async (
    reportId: string,
    type: "up" | "down",
    currentUpvoters: string[],
    currentDownvoters: string[],
  ) => {
    if (!user) {
      setShowSignInVotePrompt(true);
      return;
    }
    try {
      const upvoters = currentUpvoters || [];
      const downvoters = currentDownvoters || [];
      const hasUpvoted = upvoters.includes(user.uid);
      const hasDownvoted = downvoters.includes(user.uid);

      const updates: any = {};

      if (type === "up") {
        if (hasUpvoted) {
          updates.upvoterIds = arrayRemove(user.uid);
        } else {
          updates.upvoterIds = arrayUnion(user.uid);
          if (hasDownvoted) {
            updates.downvoterIds = arrayRemove(user.uid);
          }
        }
      } else {
        if (hasDownvoted) {
          updates.downvoterIds = arrayRemove(user.uid);
        } else {
          updates.downvoterIds = arrayUnion(user.uid);
          if (hasUpvoted) {
            updates.upvoterIds = arrayRemove(user.uid);
          }
        }
      }

      await updateDoc(doc(db, "potholes", reportId), updates);
    } catch (error) {
      console.error("Error voting: ", error);
    }
  };

  const createDotIcon = (color: string, severity: string, isSelected = false) => {
    const icon = L.divIcon({
      className: "bg-transparent",
      html: `
        <div class="marker-pulse-container relative -left-1.5 -top-1.5" data-severity="${severity}">
          ${isSelected ? "" : `<div class="marker-pulse-ring" style="background-color: ${color};"></div>`}
          <div class="marker-pulse-dot" style="background-color: ${color}; box-shadow: 0 0 10px ${color};"></div>
        </div>
      `,
      iconSize: [0, 0],
    });
    (icon.options as any).severity = severity;
    return icon;
  };

  const showPolylines = zoom >= 14;

  const renderPopup = (report: any) => {
    const upvoters = report.upvoterIds || [];
    const downvoters = report.downvoterIds || [];
    const hasUpvoted = user && upvoters.includes(user.uid);
    const hasDownvoted = user && downvoters.includes(user.uid);
    const upvoteCount = upvoters.length;
    const downvoteCount = downvoters.length;

    return (
      <Popup className="futuristic-popup">
        <div className="flex flex-col gap-1 font-mono min-w-[180px] sm:min-w-[200px] bg-black/90 text-cyan-400 p-1.5 border border-cyan-500/30">
          <h3 className="font-bold text-[10px] uppercase tracking-widest border-b border-cyan-500/30 pb-0.5 m-0 flex justify-between items-center pr-4">
            <span>Kuzhi Detected</span>
            <div className="flex gap-2">
              {(upvoteCount > 0 || downvoteCount > 0) && (
                <span
                  className={`flex items-center gap-0.5 text-[8px] ${upvoteCount - downvoteCount < 0 ? "text-red-500" : "text-cyan-400"}`}
                >
                  {upvoteCount - downvoteCount < 0 ? (
                    <ThumbsDown className="w-2 h-2 fill-red-500" />
                  ) : (
                    <ThumbsUp className="w-2 h-2 fill-cyan-400" />
                  )}
                  {upvoteCount - downvoteCount}
                </span>
              )}
            </div>
          </h3>

          {editingId !== report.id && (
            <>
              {report.imageUrl && (
                <div className="w-full h-12 mt-0.5 border border-cyan-500/30 object-cover overflow-hidden">
                  <img
                    src={report.imageUrl}
                    alt="Pothole"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-[9px] m-0 text-cyan-500/70 uppercase leading-tight line-clamp-1">
                <span className="text-cyan-500 font-bold inline mr-1">
                  Loc:
                </span>
                {report.district ? `${report.district} - ` : ""}
                {report.address || "Unknown Location"}
              </div>

              {report.roadAuthority ? (() => {
                const auth = getRoadAuthority(report.highwayTag);
                const label = report.roadAuthority === "ward" ? "Ward Member" : report.roadAuthority === "lsgd" ? "Panchayat / LSGD" : report.roadAuthority === "pwd" ? "MLA / State PWD" : "MP / NHAI";
                return (
                  <div className="text-[9px] m-0 uppercase leading-tight border-l-2 pl-1 flex flex-col gap-0.5" style={{ borderColor: auth.color + "80" }}>
                    <span style={{ color: auth.color }}><span className="font-bold">Auth:</span> {auth.label}</span>
                    <span className="text-cyan-500/60">→ {label}</span>
                  </div>
                );
              })() : (() => {
                const ac = report.acName ? report : constituencyMap[report.id];
                if (ac === undefined) return (
                  <div className="text-[9px] text-cyan-500/40 italic">loading…</div>
                );
                if (!ac) return null;
                return (
                  <div className="text-[9px] m-0 text-orange-400/90 uppercase leading-tight border-l-2 border-orange-400/50 pl-1 flex flex-col gap-0.5">
                    {ac.lsgdLabel && <span><span className="font-bold">Body:</span> {ac.lsgdLabel}</span>}
                    {ac.acName && <span><span className="font-bold">AC:</span> {ac.acName}{ac.pcName ? ` · ${ac.pcName} PC` : ""}</span>}
                  </div>
                );
              })()}

              <div className="text-[9px] m-0 text-cyan-500/70 uppercase leading-tight flex overflow-hidden">
                <span className="text-cyan-500 font-bold inline mr-1 shrink-0">
                  By:
                </span>
                <span className="truncate">
                  {(report.userName || "Unknown User").substring(0, 15)}
                  {(report.userName || "Unknown User").length > 15 ? "..." : ""}
                </span>
              </div>

              {report.notes && (
                <div className="text-[9px] m-0 text-cyan-400 break-words border-l border-cyan-500/50 pl-1 leading-tight line-clamp-2">
                  "{report.notes}"
                </div>
              )}

              {report.createdAt && (
                <div className="text-[10px] m-0 text-cyan-500/70 uppercase">
                  <span className="text-cyan-500 font-bold mr-1">Log:</span>
                  {new Date(
                    report.createdAt.toDate?.() || report.createdAt,
                  ).toLocaleString()}
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold border border-cyan-500/50 text-cyan-400">
                    {report.status?.toUpperCase() || "REPORTED"}
                  </span>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold text-black border"
                    style={{
                      backgroundColor: getColor(report.severity),
                      borderColor: getColor(report.severity),
                    }}
                  >
                    {report.severity?.toUpperCase() || "LOW"}
                  </span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(report.id, "up", upvoters, downvoters);
                    }}
                    className={`flex items-center gap-1 p-1 rounded-sm border transition-all text-[10px] font-bold ${hasUpvoted ? "border-cyan-400 bg-cyan-900/50 text-cyan-400" : "border-transparent text-cyan-500/50 hover:bg-cyan-900/30 hover:text-cyan-400"}`}
                    title="Upvote"
                  >
                    <ThumbsUp
                      className={`w-3 h-3 ${hasUpvoted ? "fill-cyan-400" : ""}`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(report.id, "down", upvoters, downvoters);
                    }}
                    className={`flex items-center gap-1 p-1 rounded-sm border transition-all text-[10px] font-bold ${hasDownvoted ? "border-red-500 bg-red-900/50 text-red-500" : "border-transparent text-cyan-500/50 hover:bg-red-900/30 hover:text-red-500"}`}
                    title="Downvote"
                  >
                    <ThumbsDown
                      className={`w-3 h-3 ${hasDownvoted ? "fill-red-500" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailReportId(report.id);
                }}
                className="w-full mt-1 py-1 text-[9px] uppercase tracking-widest text-cyan-400/70 hover:text-cyan-400 border-t border-cyan-500/20 hover:border-cyan-500/50 transition-all"
              >
                Expand ↓
              </button>
            </>
          )}

          {user?.uid === report.userId &&
            (deletingId === report.id ? (
              <div className="mt-2 flex flex-col items-center gap-2 border-t pt-2 border-cyan-500/30">
                <span className="text-[10px] uppercase font-bold text-red-500">
                  Delete Report?
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={(e) => handleDelete(report.id, e)}
                    className="flex-1 bg-red-500 hover:bg-red-400 text-black px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(null);
                    }}
                    className="flex-1 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-500/50 px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : editingId === report.id ? (
              <div className="mt-2 flex flex-col items-start gap-2 border-t pt-2 border-cyan-500/30">
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
                    Severity
                  </label>
                  <select
                    value={editSeverity}
                    onChange={(e) =>
                      setEditSeverity(
                        e.target.value as "low" | "medium" | "high",
                      )
                    }
                    className="w-full bg-cyan-900/20 text-cyan-400 border border-cyan-500/50 p-1 mt-1 text-[10px] uppercase outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-cyan-900/20 text-cyan-400 border border-cyan-500/50 p-1 mt-1 text-[10px] uppercase outline-none min-h-[40px] resize-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                    placeholder="Update notes..."
                  />
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
                    Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={editFileInputRef}
                    onChange={handleEditImageChange}
                  />
                  {editImageUrl ? (
                    <div className="relative mt-1 border border-cyan-500/50 p-1 w-full max-h-20 overflow-hidden flex justify-center bg-black/50">
                      <img
                        src={editImageUrl}
                        alt="edit preview"
                        className="max-h-16 object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditImageUrl(null);
                        }}
                        className="absolute top-1 right-1 bg-black/80 p-0.5 border border-cyan-500/50 text-cyan-400 hover:text-red-500"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        editFileInputRef.current?.click();
                      }}
                      className="mt-1 w-full border border-cyan-500/50 border-dashed text-cyan-500 p-1 text-[10px] hover:bg-cyan-900/30"
                      type="button"
                    >
                      <Camera className="w-3 h-3 mx-auto" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full mt-1">
                  <button
                    onClick={(e) => handleSaveEdit(report.id, e)}
                    disabled={isSavingEdit}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black px-2 py-1 uppercase text-[10px] font-bold transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                    className="flex-1 bg-cyan-900/50 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-500/50 px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditNotes(report.notes || "");
                    setEditSeverity(report.severity || "low");
                    setEditImageUrl(report.imageUrl || null);
                    setEditingId(report.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors shadow-[0_0_10px_rgba(0,255,255,0.1)]"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(report.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors shadow-[0_0_10px_rgba(255,0,60,0.1)]"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ))}
        </div>
      </Popup>
    );
  };

  return (
    <>
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        iconCreateFunction={(cluster: any) => {
          const markers = cluster.getAllChildMarkers();

          let highCount = 0;
          let mediumCount = 0;
          let lowCount = 0;

          markers.forEach((marker: any) => {
            const sev = marker.options.icon.options.severity || "low";
            if (sev === "high") highCount++;
            else if (sev === "medium") mediumCount++;
            else lowCount++;
          });

          const totalWeight = highCount * 3 + mediumCount * 2 + lowCount * 1;
          const avgWeight = totalWeight / markers.length;

          let light = "#a0ffff", mid = "#00f0ff", dark = "#008fab";
          if (avgWeight >= 2.5) {
            light = "#ff8099"; mid = "#ff003c"; dark = "#8b0020";
          } else if (avgWeight >= 1.5) {
            light = "#ffd080"; mid = "#ff9900"; dark = "#a05c00";
          }

          return L.divIcon({
            html: `
              <div style="
                width:28px;height:28px;border-radius:50%;
                background:radial-gradient(circle at 35% 30%, ${light} 0%, ${mid} 45%, ${dark} 100%);
                box-shadow:0 0 8px ${mid}bb, inset 0 1px 3px rgba(255,255,255,0.3);
                display:flex;align-items:center;justify-content:center;
                font-size:9px;font-weight:bold;color:#001a1f;font-family:monospace;
              ">${markers.length}</div>
            `,
            className: "bg-transparent",
            iconSize: L.point(28, 28, true),
          });
        }}
      >
        {reports.map((report) => {
          if (!report.encodedPath) return null;
          try {
            const path = decode(report.encodedPath).map(
              ([lat, lng]) => [lat, lng] as [number, number],
            );
            if (path.length === 0) return null;
            const displaySeverity =
              editingId === report.id ? editSeverity : report.severity;
            return (
              <Marker
                key={`marker-${report.id}`}
                position={path[0]}
                icon={createDotIcon(
                  getColor(displaySeverity),
                  displaySeverity || "low",
                  detailReportId === report.id,
                )}
                eventHandlers={{
                  click: (e: any) => {
                    if (e.target && e.target._map) {
                      e.target._map.flyTo(path[0], 16, { duration: 1 });
                    }
                    fetchConstituency(report);
                  },
                }}
              >
                {renderPopup(report)}
              </Marker>
            );
          } catch (e) {
            return null;
          }
        })}
      </MarkerClusterGroup>

      {showPolylines &&
        reports.map((report) => {
          if (!report.encodedPath) return null;
          try {
            const path = decode(report.encodedPath).map(
              ([lat, lng]) => [lat, lng] as [number, number],
            );
            const displaySeverity =
              editingId === report.id ? editSeverity : report.severity;
            return (
              <Polyline
                key={`line-${report.id}`}
                positions={path}
                pathOptions={{
                  className:
                    displaySeverity === "high"
                      ? "animated-polyline-high"
                      : "animated-polyline",
                  color: getColor(displaySeverity),
                  weight: displaySeverity === "high" ? 6 : 4,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: (e: any) => {
                    if (e.target && e.target._map) {
                      e.target._map.flyToBounds(L.latLngBounds(path), {
                        maxZoom: 16,
                        padding: [50, 50],
                        duration: 0.8,
                      });
                    }
                    fetchConstituency(report);
                    e.target?.openPopup(e.latlng);
                  },
                }}
              >
                {renderPopup(report)}
              </Polyline>
            );
          } catch (e) {
            return null;
          }
        })}

      <AnimatePresence>
        {detailReportId && (() => {
          const liveReport = reports.find((r) => r.id === detailReportId);
          if (!liveReport) return null;
          const ac = liveReport.acName ? liveReport : constituencyMap[liveReport.id];
          return (
            <ReportDetailSheet
              key={detailReportId}
              report={liveReport}
              ac={ac}
              user={user}
              onVote={handleVote}
              onClose={() => setDetailReportId(null)}
            />
          );
        })()}
      </AnimatePresence>

      {showSignInVotePrompt && (
        <SignInToVoteModal onClose={() => setShowSignInVotePrompt(false)} />
      )}
    </>
  );
}

function SignInToVoteModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-[2600] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed z-[2601] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(340px,90vw)] bg-black/95 border border-cyan-500/40 rounded-xl font-mono shadow-[0_0_40px_rgba(0,255,255,0.1)] p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[9px] uppercase tracking-widest text-cyan-500/60">Sign in required</div>
          <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400 -mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-cyan-400">Vote on reports</div>
          <p className="text-[11px] text-cyan-400/70 leading-relaxed">
            Sign in to confirm or dispute pothole reports. Your identity is only used to prevent duplicate votes — it is never shared or displayed publicly.
          </p>
        </div>
        <button
          onClick={() => { loginWithGoogle(); onClose(); }}
          className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors rounded"
        >
          Sign in with Google
        </button>
      </div>
    </>
  );
}

function SignInToReportModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-[2600] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed z-[2601] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(340px,90vw)] bg-black/95 border border-cyan-500/40 rounded-xl font-mono shadow-[0_0_40px_rgba(0,255,255,0.1)] p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[9px] uppercase tracking-widest text-cyan-500/60">Sign in required</div>
          <button onClick={onClose} className="text-cyan-500/40 hover:text-cyan-400 -mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-cyan-400">Report a pothole</div>
          <p className="text-[11px] text-cyan-400/70 leading-relaxed">
            Sign in to report potholes in your area. Your identity is only used to track your reports — it is never shared or displayed publicly.
          </p>
        </div>
        <button
          onClick={() => { loginWithGoogle(); onClose(); }}
          className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors rounded"
        >
          Sign in with Google
        </button>
      </div>
    </>
  );
}

function MiniMap({ reportId, encodedPath, severity, roadAuthority: initialRoadAuthority, highwayTag: initialHighwayTag }: { reportId: string; encodedPath: string; severity: string; roadAuthority?: string; highwayTag?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [roadAuthority, setRoadAuthority] = useState(initialRoadAuthority);
  const [highwayTag, setHighwayTag] = useState(initialHighwayTag);

  const coords = decode(encodedPath).map(([lat, lng]) => [lat, lng] as [number, number]);

  useEffect(() => {
    if (!containerRef.current || !coords.length) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const color = getColor(severity);
    L.polyline(coords, {
      color, weight: 5, opacity: 0.9,
      className: severity === "high" ? "animated-polyline-high" : "animated-polyline",
    }).addTo(map);

    map.fitBounds(L.latLngBounds(coords), { padding: [10, 10], animate: false });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [encodedPath]);

  // Fetch classification if missing, then persist it
  useEffect(() => {
    if (roadAuthority || !coords.length) return;
    let cancelled = false;
    const [lat, lng] = coords[0];
    fetchWithAppCheck(`/api/road-classification?lat=${lat}&lng=${lng}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setRoadAuthority(data.roadAuthority);
        setHighwayTag(data.highwayTag);
        updateDoc(doc(db, "potholes", reportId), data).catch(() => { });
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [reportId, roadAuthority]);

  if (!coords.length) return null;

  const authority = highwayTag ? getRoadAuthority(highwayTag) : null;
  const authorityLabel = roadAuthority === "ward" ? "Ward Member" : roadAuthority === "lsgd" ? "Panchayat / LSGD" : roadAuthority === "pwd" ? "MLA / State PWD" : roadAuthority === "national" ? "MP / NHAI" : null;

  return (
    <div className="relative" style={{ height: 160 }}>
      <div
        ref={containerRef}
        style={{ height: 160, borderRadius: "0.375rem", border: "1px solid rgba(0,255,255,0.2)", overflow: "hidden" }}
      />
      <div className="absolute top-2 left-2 z-[1000]">
        {authority && authorityLabel ? (
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded" style={{ border: `1px solid ${authority.color}40` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: authority.color }} />
            <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: authority.color }}>{authority.label}</span>
            <span className="text-[9px] text-white/50">→ {authorityLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded border border-cyan-500/20 overflow-hidden" style={{ width: 160 }}>
            <div className="h-3 rounded w-full bg-gradient-to-r from-cyan-900/40 via-cyan-500/20 to-cyan-900/40" style={{ backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDetailSheet({ report, ac: initialAc, user, onVote, onClose }: any) {
  const [ac, setAc] = useState(initialAc ?? null);

  useEffect(() => {
    if (ac) return;
    if (!report.encodedPath) return;
    (async () => {
      try {
        const { decode } = await import("@googlemaps/polyline-codec");
        const path = decode(report.encodedPath);
        if (!path.length) return;
        const [lat, lng] = path[0];
        const info = await getConstituency(lat, lng);
        if (info) setAc(info);
      } catch { }
    })();
  }, [report.encodedPath]);

  const upvoters = report.upvoterIds || [];
  const downvoters = report.downvoterIds || [];
  const hasUpvoted = user && upvoters.includes(user.uid);
  const hasDownvoted = user && downvoters.includes(user.uid);
  const color = getColor(report.severity);

  const shareUrl = `https://kuzhiyundo.com?id=${report.id}`;
  const reporterLine = report.userName && report.notes
    ? `${report.userName} says: "${report.notes}"`
    : report.userName
      ? `Reported by ${report.userName}`
      : report.notes
        ? `"${report.notes}"`
        : null;
  const shareText = [
    `🚧 Pothole reported in ${report.address || "Unknown Location"}`,
    `Severity: ${(report.severity || "low").toUpperCase()} | Score: ${upvoters.length - downvoters.length > 0 ? "+" : ""}${upvoters.length - downvoters.length}`,
    reporterLine,
    `Reported on kuzhiyundo?`,
  ].filter(Boolean).join("\n");

  const buildRouteImage = (): string | null => {
    if (!report.encodedPath) return null;
    try {
      const path = decode(report.encodedPath).map(([lat, lng]) => [lat, lng] as [number, number]);
      if (!path.length) return null;
      const canvas = document.createElement("canvas");
      canvas.width = 800; canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 800, 400);
      const lats = path.map(([lat]) => lat);
      const lngs = path.map(([, lng]) => lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const pad = 60, w = 800 - pad * 2, h = 400 - pad * 2;
      const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 0.0001)) * w;
      const toY = (lat: number) => pad + (1 - (lat - minLat) / (maxLat - minLat || 0.0001)) * h;
      // Grid lines
      ctx.strokeStyle = "rgba(0,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = pad + (w / 4) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 400); ctx.stroke();
        const y = pad + (h / 4) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
      }
      // Glow pass
      ctx.shadowColor = color; ctx.shadowBlur = 20;
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      path.forEach(([lat, lng], i) => i === 0 ? ctx.moveTo(toX(lng), toY(lat)) : ctx.lineTo(toX(lng), toY(lat)));
      ctx.stroke();
      // Solid pass
      ctx.shadowBlur = 0; ctx.lineWidth = 3;
      ctx.beginPath();
      path.forEach(([lat, lng], i) => i === 0 ? ctx.moveTo(toX(lng), toY(lat)) : ctx.lineTo(toX(lng), toY(lat)));
      ctx.stroke();
      // Endpoints
      ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color;
      [[path[0][0], path[0][1]], [path[path.length - 1][0], path[path.length - 1][1]]].forEach(([lat, lng]) => {
        ctx.beginPath(); ctx.arc(toX(lng), toY(lat), 7, 0, Math.PI * 2); ctx.fill();
      });
      // Watermark
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,255,255,0.3)";
      ctx.font = "bold 13px monospace"; ctx.fillText("kuzhiyundo.com", pad, 400 - 16);
      return canvas.toDataURL("image/png");
    } catch { return null; }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Kuzhiyundo — Pothole Report", text: shareText, url: shareUrl });
        return;
      } catch { }
    }
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).catch(() => { });
  };

  const dragY = useMotionValue(0);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[2500] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onPointerDown={(e) => e.nativeEvent.stopPropagation()}
        onTouchStart={(e) => e.nativeEvent.stopPropagation()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-[600px] z-[2501] bg-black/95 border-t border-cyan-500/40 rounded-t-2xl font-mono max-h-[85vh] overflow-y-auto shadow-[0_-8px_40px_rgba(0,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.nativeEvent.stopPropagation()}
        onTouchStart={(e) => e.nativeEvent.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.4 }}
        style={{ y: dragY }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 400) {
            onClose();
          }
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 sticky top-0 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-cyan-500/40" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-2 pb-3 border-b border-cyan-500/20">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-cyan-500/60 mb-1">Kuzhi Report</div>
            <div className="text-sm font-bold text-cyan-400 line-clamp-2">{report.address || "Unknown Location"}</div>
            {ac && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {ac.lsgdLabel && <div className="text-[10px] text-orange-400/80">{ac.lsgdLabel}</div>}
                {ac.acName && (
                  <div className="text-[10px] text-orange-400/60">
                    {ac.acName} AC{ac.pcName ? ` · ${ac.pcName} PC` : ""}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 ml-3 mt-1 shrink-0">
            <button onClick={handleShare} className="text-cyan-500/50 hover:text-cyan-400">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-cyan-500/50 hover:text-cyan-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          {/* Mini map */}
          {report.encodedPath && (
            <MiniMap reportId={report.id} encodedPath={report.encodedPath} severity={report.severity || "low"} roadAuthority={report.roadAuthority} highwayTag={report.highwayTag} />
          )}

          {/* Severity + Status + Score */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[9px] uppercase font-bold text-black" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}>
              {report.severity?.toUpperCase() || "LOW"}
            </span>
            <span className="px-2 py-0.5 text-[9px] uppercase font-bold border border-cyan-500/50 text-cyan-400">
              {report.status?.toUpperCase() || "REPORTED"}
            </span>
            <span className="text-[9px] text-cyan-500/60 ml-auto">
              Score: <span className={upvoters.length - downvoters.length < 0 ? "text-red-400" : "text-cyan-400"}>
                {upvoters.length - downvoters.length > 0 ? "+" : ""}{upvoters.length - downvoters.length}
              </span>
            </span>
          </div>

          {/* Image */}
          {report.imageUrl && (
            <div className="w-full rounded border border-cyan-500/30 overflow-hidden">
              <img src={report.imageUrl} alt="Pothole" className="w-full object-cover max-h-48" />
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
            <div>
              <div className="text-cyan-500/50 uppercase tracking-widest mb-0.5">Reported By</div>
              <div className="text-cyan-300 font-bold">{report.userName || "Anonymous"}</div>
            </div>
            <div>
              <div className="text-cyan-500/50 uppercase tracking-widest mb-0.5">Date</div>
              <div className="text-cyan-300 font-bold">
                {report.createdAt
                  ? new Date(report.createdAt.toDate?.() || report.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </div>
            </div>
            {report.district && (
              <div>
                <div className="text-cyan-500/50 uppercase tracking-widest mb-0.5">District</div>
                <div className="text-cyan-300 font-bold">{report.district}</div>
              </div>
            )}

            <div>
              <div className="text-cyan-500/50 uppercase tracking-widest mb-0.5">Upvotes</div>
              <div className="text-cyan-300 font-bold">{upvoters.length}</div>
            </div>
            <div>
              <div className="text-cyan-500/50 uppercase tracking-widest mb-0.5">Downvotes</div>
              <div className="text-cyan-300 font-bold">{downvoters.length}</div>
            </div>
          </div>

          {/* Notes */}
          {report.notes && (
            <div className="border-l-2 border-cyan-500/40 pl-3 text-[11px] text-cyan-400/80 italic leading-relaxed">
              "{report.notes}"
            </div>
          )}

          {/* Vote buttons */}
          <div className="flex gap-2 pt-1 border-t border-cyan-500/20">
            <button
              onClick={(e) => { e.stopPropagation(); onVote(report.id, "up", upvoters, downvoters); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase border transition-all ${hasUpvoted ? "border-cyan-400 bg-cyan-900/50 text-cyan-400" : "border-cyan-500/30 text-cyan-500/50 hover:bg-cyan-900/30 hover:text-cyan-400"}`}
            >
              <ThumbsUp className={`w-3 h-3 ${hasUpvoted ? "fill-cyan-400" : ""}`} />
              Confirm ({upvoters.length})
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVote(report.id, "down", upvoters, downvoters); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase border transition-all ${hasDownvoted ? "border-red-500 bg-red-900/50 text-red-500" : "border-cyan-500/30 text-cyan-500/50 hover:bg-red-900/30 hover:text-red-500"}`}
            >
              <ThumbsDown className={`w-3 h-3 ${hasDownvoted ? "fill-red-500" : ""}`} />
              Dispute ({downvoters.length})
            </button>
          </div>
        </div>

        <div style={{ height: "max(0.75rem, var(--sab))" }} />
      </motion.div>
    </>
  );
}

function ReportingOverlay({
  reportsCount,
  reportingMode,
  setReportingMode,
  origin,
  destination,
  pointsConfirmed,
  onConfirmPoints,
  currentPathEncoded,
  severity,
  setSeverity,
  onCancel,
}: any) {
  const user = useAuthStore((state) => state.user);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [showSignInReportPrompt, setShowSignInReportPrompt] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        isExpanded &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (overlayRef.current) {
      L.DomEvent.disableClickPropagation(overlayRef.current);
      L.DomEvent.disableScrollPropagation(overlayRef.current);
    }
  }, []);

  if (!reportingMode) {
    return (
      <>
        <div
          ref={overlayRef}
          className="absolute z-[1000] left-4 right-4 md:right-auto md:w-80 flex flex-col gap-3 font-mono pointer-events-none" style={{ top: "max(1rem, var(--sat))" }}
          onMouseEnter={() => setIsDesktopHovered(true)}
          onMouseLeave={() => setIsDesktopHovered(false)}
        >
          <div className="bg-black/80 border border-cyan-500/50 p-4 md:p-5 shadow-[0_0_20px_rgba(0,255,255,0.15)] backdrop-blur-md relative pointer-events-auto transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold tracking-[0.2em] text-cyan-400 flex items-center gap-2 md:gap-3 uppercase">
                  <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 md:w-6 md:h-6"
                    >
                      <path
                        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 7.5 l1.5 0.5 l0.5 1.5 l-0.5 1 l1.5 0.5 l-1.5 1.5 l-1.5 -0.5 l-1 1.5 l-1 -1.5 l-1.5 -0.5 l0.5 -1 l-1 -1.5 l1.5 -0.5 l1 -1 Z"
                        fill="black"
                        stroke="black"
                        strokeWidth="1"
                        strokeLinejoin="miter"
                      />
                      <circle cx="16" cy="7" r="1.5" fill="black" stroke="none" />
                      <circle cx="8" cy="12" r="1" fill="black" stroke="none" />
                      <circle
                        cx="15"
                        cy="13"
                        r="0.8"
                        fill="black"
                        stroke="none"
                      />
                    </svg>
                  </span>
                  <span className="font-handwriting text-2xl md:text-3xl tracking-normal normal-case font-normal">
                    Kuzhiyundo?
                  </span>
                </h1>
                <div className="text-[9px] md:text-[10px] text-cyan-500/80 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1 overflow-hidden h-4 md:h-5">
                  <div className="flex items-center justify-center mr-0.5">
                    <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff003c] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#ff003c]"></span>
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={reportsCount}
                      initial={{
                        y: -15,
                        opacity: 0,
                        filter: "blur(4px)",
                        color: "#00f0ff",
                      }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        filter: "blur(0px)",
                        color: "currentColor",
                      }}
                      exit={{
                        y: 15,
                        opacity: 0,
                        filter: "blur(4px)",
                        color: "#00f0ff",
                      }}
                      transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                      className="inline-block"
                    >
                      {reportsCount}
                    </motion.span>
                  </AnimatePresence>
                  <span>
                    {reportsCount === 1 ? "Pothole" : "Potholes"} Reported
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => user ? setReportingMode(true) : setShowSignInReportPrompt(true)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 text-[10px] uppercase tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(0,255,255,0.4)] transition-all"
                >
                  <Plus className="w-3 h-3" /> Report
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="md:hidden text-cyan-400 p-1 border border-cyan-500/30 rounded-sm bg-cyan-900/30 hover:bg-cyan-800/50 transition-colors"
                >
                  <div
                    className="transition-transform duration-300"
                    style={{ transform: `rotate(${isExpanded ? 180 : 0}deg)` }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ${isDesktopHovered ? "md:grid-rows-[1fr]" : "md:grid-rows-[0fr]"} ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden flex flex-col">
                <div className="pt-3">
                  <p className="text-[9px] md:text-[10px] text-cyan-500/70 uppercase tracking-widest border-t border-cyan-500/20 pt-2">
                    Community Pothole Tracker
                  </p>
                  <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-cyan-500/20 flex items-center gap-1.5 text-[8px] md:text-[9px] text-cyan-500/60 uppercase tracking-widest">
                    <span>Built with</span>
                    <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500 fill-red-500 animate-pulse" />
                    <span>by</span>
                    <a
                      href="https://sajithlal.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-white transition-colors underline underline-offset-2 decoration-cyan-500/50 pointer-events-auto"
                    >
                      Sajithlal
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 pointer-events-auto ${isDesktopHovered ? "md:grid-rows-[1fr]" : "md:grid-rows-[0fr]"} ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden flex flex-col">
              <div className="flex flex-col gap-2 md:gap-3">
                <button
                  onClick={() => document.getElementById("seo-content")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-black/50 hover:bg-cyan-500/10 text-cyan-500 hover:text-cyan-300 py-1.5 md:py-2 px-4 transition-all border border-cyan-500/30 hover:border-cyan-400/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
                >
                  <ExternalLink className="w-3 h-3" /> About
                </button>
                <a
                  href="https://github.com/sajithlaldev/kuzhiyundo/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/50 hover:bg-yellow-500/10 text-cyan-500 hover:text-yellow-400 py-1.5 md:py-2 px-4 transition-all border border-cyan-500/30 hover:border-yellow-500/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
                >
                  <Bug className="w-3 h-3" /> Report a Bug <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
                {user && (
                  <button
                    onClick={logout}
                    className="bg-black/50 hover:bg-red-500/20 text-cyan-500 hover:text-red-400 py-1.5 md:py-2 px-4 transition-all border border-cyan-500/30 hover:border-red-500/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
                  >
                    <LogOut className="w-3 h-3" /> SIGN OUT
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {showSignInReportPrompt && (
          <SignInToReportModal onClose={() => setShowSignInReportPrompt(false)} />
        )}
      </>
    );
  }

  return (
    <div ref={overlayRef} className="absolute z-[9999] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-max md:max-w-[90vw] flex flex-col items-center flex-nowrap font-mono" style={{ top: "max(1rem, var(--sat))" }}>
      <div className="bg-black/90 border border-cyan-500/60 w-full px-4 md:px-6 py-5 shadow-[0_0_25px_rgba(0,255,255,0.2)] backdrop-blur-md flex flex-col items-center text-center relative pointer-events-auto max-h-[80vh] overflow-y-auto">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,1)]"></div>

        {!origin ? (
          <>
            <Navigation className="w-6 h-6 text-cyan-400 mb-3 animate-pulse" />
            <h3 className="text-cyan-400 font-bold uppercase tracking-[0.15em] mb-1">Step 1: Start Point</h3>
            <p className="text-cyan-500/60 text-[10px] uppercase tracking-widest">&gt; tap map where kuzhi starts</p>
          </>
        ) : !destination ? (
          <>
            <Navigation className="w-6 h-6 text-cyan-400 mb-3 animate-pulse" />
            <h3 className="text-cyan-400 font-bold uppercase tracking-[0.15em] mb-1">Step 2: End Point</h3>
            <p className="text-cyan-500/60 text-[10px] uppercase tracking-widest">&gt; tap map where kuzhi ends</p>
          </>
        ) : !pointsConfirmed ? (
          <>
            <Navigation className="w-6 h-6 text-cyan-400 mb-3" />
            <h3 className="text-cyan-400 font-bold uppercase tracking-[0.15em] mb-1">Points Selected</h3>
            <p className="text-cyan-500/60 text-[10px] uppercase tracking-widest mb-4">&gt; tap map to reselect start point</p>
            <button
              onClick={onConfirmPoints}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)]"
            >
              Confirm Points
            </button>
          </>
        ) : (
          <SubmitRouteForm
            currentPathEncoded={currentPathEncoded}
            origin={origin}
            severity={severity}
            setSeverity={setSeverity}
            onCancel={onCancel}
          />
        )}

        {!pointsConfirmed && (
          <button onClick={onCancel} className="mt-6 text-[10px] text-cyan-500/50 hover:text-red-400 uppercase tracking-widest transition-colors">
            [ CANCEL ]
          </button>
        )}
      </div>
    </div>
  );
}

const ROAD_AUTHORITY_MAP: Record<string, { label: string; authority: string; color: string }> = {
  motorway: { label: "National Highway", authority: "national", color: "#f59e0b" },
  motorway_link: { label: "National Highway", authority: "national", color: "#f59e0b" },
  trunk: { label: "State Highway", authority: "national", color: "#f59e0b" },
  trunk_link: { label: "State Highway", authority: "national", color: "#f59e0b" },
  primary: { label: "State Highway", authority: "national", color: "#f59e0b" },
  primary_link: { label: "State Highway", authority: "national", color: "#f59e0b" },
  secondary: { label: "State PWD Road", authority: "pwd", color: "#f97316" },
  secondary_link: { label: "State PWD Road", authority: "pwd", color: "#f97316" },
  tertiary: { label: "Panchayat Road", authority: "lsgd", color: "#a78bfa" },
  tertiary_link: { label: "Panchayat Road", authority: "lsgd", color: "#a78bfa" },
};

function getRoadAuthority(highwayTag: string) {
  return ROAD_AUTHORITY_MAP[highwayTag] ?? { label: "Local Road", authority: "ward", color: "#34d399" };
}

async function fetchRoadClassification(lat: number, lng: number): Promise<{ highwayTag: string; roadAuthority: string } | null> {
  try {
    const res = await fetchWithAppCheck(`/api/road-classification?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function SubmitRouteForm({
  currentPathEncoded,
  origin,
  severity,
  setSeverity,
  onCancel,
}: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const [address, setAddress] = useState<string>("Locating...");
  const [district, setDistrict] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          if (dataUrl.length > 800000) {
            setErrorMsg("Image is too large even after compression.");
            return;
          }
          setImageUrl(dataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let active = true;
    if (origin) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${origin.lat}&lon=${origin.lng}&zoom=18&addressdetails=1`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (active) {
            setAddress(data.display_name || "Unknown Location");
            setDistrict(
              data.address?.state_district ||
              data.address?.county ||
              data.address?.city_district ||
              null,
            );
            setPincode(data.address?.postcode || null);
          }
        })
        .catch(() => {
          if (active) {
            setAddress("Unknown Location");
            setDistrict(null);
            setPincode(null);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [origin]);

  const submit = async () => {
    if (!currentPathEncoded || !user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const [constituency, roadInfo] = await Promise.all([
        getConstituency(origin.lat, origin.lng),
        fetchRoadClassification(origin.lat, origin.lng),
      ]);

      const payload: any = {
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        encodedPath: currentPathEncoded,
        createdAt: serverTimestamp(),
        status: "reported",
        severity,
        address,
        upvoterIds: [],
      };
      if (district) payload.district = district;
      if (pincode) payload.pincode = pincode;
      if (notes.trim()) payload.notes = notes.trim();
      if (imageUrl) payload.imageUrl = imageUrl;
      if (constituency) {
        payload.acName = constituency.acName;
        payload.acNo = constituency.acNo;
        payload.pcName = constituency.pcName;
        if (constituency.lsgd) payload.lsgd = constituency.lsgd;
        if (constituency.lsgdType) payload.lsgdType = constituency.lsgdType;
        if (constituency.lsgdLabel) payload.lsgdLabel = constituency.lsgdLabel;
      }
      if (roadInfo) {
        payload.highwayTag = roadInfo.highwayTag;
        payload.roadAuthority = roadInfo.roadAuthority;
      }

      await addDoc(collection(db, "potholes"), payload);
      onCancel(); // Reset and close
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-[280px]">
      <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2 border-b border-cyan-500/30 pb-3">
        <CheckCircle className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        <span className="uppercase tracking-[0.2em] font-bold text-xs">
          Route Selected
        </span>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
          Reporting As
        </label>
        <p className="text-[10px] text-cyan-300 bg-cyan-900/30 border border-cyan-500/30 p-2 truncate">
          {(user?.displayName || user?.email || "Anonymous").substring(0, 20)}
          {(user?.displayName || user?.email || "Anonymous").length > 20
            ? "..."
            : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
          Location
        </label>
        <p className="text-[10px] text-cyan-300 bg-cyan-900/30 border border-cyan-500/30 p-2 break-words">
          {address}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
          Severity Level
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSeverity("low")}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${severity === "low" ? "bg-[#00f0ff] text-black shadow-[0_0_10px_#00f0ff] border-[#00f0ff]" : "bg-black text-[#00f0ff] border-[#00f0ff]/40 hover:bg-[#00f0ff]/20"}`}
          >
            Low
          </button>
          <button
            onClick={() => setSeverity("medium")}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${severity === "medium" ? "bg-[#ff9900] text-black shadow-[0_0_10px_#ff9900] border-[#ff9900]" : "bg-black text-[#ff9900] border-[#ff9900]/40 hover:bg-[#ff9900]/20"}`}
          >
            Medium
          </button>
          <button
            onClick={() => setSeverity("high")}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${severity === "high" ? "bg-[#ff003c] text-black shadow-[0_0_10px_#ff003c] border-[#ff003c]" : "bg-black text-[#ff003c] border-[#ff003c]/40 hover:bg-[#ff003c]/20"}`}
          >
            High
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
            Optional Notes
          </label>
          <span className="text-[9px] text-cyan-500/50 uppercase">
            {notes.length}/200
          </span>
        </div>
        <textarea
          maxLength={200}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the issue..."
          className="bg-cyan-900/20 border border-cyan-500/30 text-cyan-300 text-[10px] p-2 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_5px_rgba(0,240,255,0.3)] resize-none h-16 w-full placeholder:text-cyan-500/30 font-mono scrollbar-none"
        />
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/70 border-l-2 border-cyan-500 pl-2">
          Photo (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />
        {imageUrl ? (
          <div className="relative border border-cyan-500/50 p-1 w-full max-h-24 overflow-hidden rounded-sm flex items-center justify-center bg-black/50">
            <img
              src={imageUrl}
              alt="Pothole"
              className="max-h-20 object-contain"
            />
            <button
              onClick={() => {
                setImageUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-1 right-1 bg-black/80 border border-cyan-500 text-cyan-500 p-0.5 hover:text-red-500 hover:border-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-cyan-500/50 hover:border-cyan-500 hover:bg-cyan-900/30 text-cyan-500/70 py-4 flex flex-col items-center justify-center gap-2 transition-colors w-full"
          >
            <Camera className="w-5 h-5 text-cyan-500/50" />
            <span className="text-[9px] uppercase tracking-widest">
              Add Photo
            </span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-center text-[10px] uppercase font-bold text-red-500 mt-1 bg-red-500/10 border border-red-500/30 p-1">
          {errorMsg}
        </div>
      )}

      <button
        onClick={submit}
        disabled={isSubmitting || !currentPathEncoded}
        className="mt-2 text-black font-bold uppercase tracking-[0.15em] text-xs py-3 w-full transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        style={{
          backgroundColor:
            severity === "high"
              ? "#ff003c"
              : severity === "medium"
                ? "#ff9900"
                : "#00f0ff",
          boxShadow: `0 0 15px ${severity === "high" ? "#ff003c" : severity === "medium" ? "#ff9900" : "#00f0ff"}`,
        }}
      >
        {isSubmitting ? "SUBMITTING..." : "SUBMIT REPORT"}
      </button>
      <button
        onClick={onCancel}
        className="text-[10px] text-cyan-500/50 hover:text-red-400 uppercase tracking-widest transition-colors mt-2"
      >
        [ CANCEL ]
      </button>
    </div>
  );
}

function MapSearch() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const normalizeSearchResults = (data: any) => {
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.predictions)
        ? data.predictions
        : [];

    return items
      .map((item: any) => {
        const lat = item.lat ?? item.geometry?.location?.lat;
        const lon = item.lon ?? item.lng ?? item.geometry?.location?.lng;
        const terms = item.terms ?? [];

        return {
          ...item,
          display_name: item.display_name ?? item.description ?? "",
          name: item.name ?? item.structured_formatting?.main_text,
          lat: String(lat ?? ""),
          lon: String(lon ?? ""),
          address: item.address ?? {
            road: terms[0]?.value,
            city: terms[1]?.value,
            state: terms.at(-3)?.value,
            country: terms.at(-1)?.value,
          },
        };
      })
      .filter((item: any) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)));
  };

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setShowResults(true);
    setIsSearching(true);
    try {
      const res = await fetchWithAppCheck(`/api/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setResults(normalizeSearchResults(data));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const goToPlace = (result: any) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    map.flyTo([lat, lon], 15);
    setShowResults(false);
    setQuery("");
  };

  return (
    <div className="absolute z-[1000] bottom-[calc(4.5rem_+_var(--sab))] left-4 right-4 md:bottom-auto md:top-[max(1rem,var(--sat))] md:left-auto md:w-64 flex flex-col pointer-events-none">
      <div className="relative pointer-events-auto shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <input
          type="text"
          value={query}
          onChange={(e) => searchPlaces(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="SEARCH LOCATION..."
          style={{ fontSize: 16 }}
          className="w-full bg-black/90 border border-cyan-500/50 text-cyan-400 pl-8 pr-3 py-2 uppercase tracking-widest outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] placeholder:text-cyan-500/30 font-mono backdrop-blur-md"
        />
        <Search className="w-4 h-4 text-cyan-500/50 absolute left-2.5 top-1/2 -translate-y-1/2" />

        {showResults && results.length > 0 && (
          <div className="absolute bottom-full mb-1 md:bottom-auto md:top-full md:mt-1 md:mb-0 w-full bg-black/95 border border-cyan-500/30 max-h-[min(15rem,50vh)] overflow-y-auto backdrop-blur-md">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => goToPlace(r)}
                className="w-full text-left px-3 py-2 hover:bg-cyan-900/40 text-cyan-400 text-xs flex flex-col border-b border-cyan-500/10 last:border-0"
              >
                <span className="font-bold truncate w-full block">
                  {r.name || r.display_name?.split(",")[0] || "Unknown"}
                </span>
                <span className="text-[9px] text-cyan-500/60 truncate w-full block">
                  {r.subtitle || r.display_name || ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
