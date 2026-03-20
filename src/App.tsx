import { saveItinerary, loadItinerary } from "./firebase";
import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  Copy,
  ExternalLink,
  X,
  Clock,
  MapPin,
  Tag,
} from "lucide-react";

const ItineraryPlanner = () => {
  const [snapInterval, setSnapInterval] = useState(15);
  const [activities, setActivities] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({
    name: "",
    duration: 60,
    area: "",
    type: "",
    description: "",
    url: "",
  });
  const [draggedActivity, setDraggedActivity] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [resizingActivity, setResizingActivity] = useState(null);
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([
    "Food",
    "Culture",
    "Entertainment",
    "Outdoor",
    "Shopping",
    "Other",
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [tripConfig, setTripConfig] = useState({
    tripName: "Vancouver Trip",
    startDate: "2026-09-09",
    numDays: 5,
  });

  const typeDurationDefaults: Record<string, number> = {
    Food: 90,
    Culture: 120,
    Entertainment: 120,
    Outdoor: 180,
    Shopping: 60,
    Other: 60,
  };

  const generateDays = (startDateStr: string, numDays: number) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const result = [];
    const start = new Date(startDateStr + "T12:00:00");
    for (let i = 0; i < numDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push({
        date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
        dayOfWeek: dayNames[d.getDay()],
      });
    }
    return result;
  };

  const days = generateDays(tripConfig.startDate, tripConfig.numDays);
  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += snapInterval) {
      timeSlots.push(
        `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
      );
    }
  }

  const scheduledStartTimes = new Set();
  activities.forEach((a) => {
    if (a.scheduledTime) {
      scheduledStartTimes.add(a.scheduledTime);
    }
  });

  const allDisplayTimes = [
    ...new Set([...timeSlots, ...scheduledStartTimes]),
  ].sort();

  const allAreas = [...new Set(activities.map((a) => a.area))].sort();
  const colorPalette = [
    "bg-blue-200 border-blue-400",
    "bg-purple-200 border-purple-400",
    "bg-green-200 border-green-400",
    "bg-orange-200 border-orange-400",
    "bg-pink-200 border-pink-400",
    "bg-yellow-200 border-yellow-400",
    "bg-red-200 border-red-400",
    "bg-indigo-200 border-indigo-400",
    "bg-teal-200 border-teal-400",
    "bg-lime-200 border-lime-400",
    "bg-cyan-200 border-cyan-400",
    "bg-fuchsia-200 border-fuchsia-400",
  ];

  const areaColors = {};
  allAreas.forEach((area, index) => {
    areaColors[area] = colorPalette[index % colorPalette.length];
  });

  const getAreaColor = (area) => {
    return areaColors[area] || "bg-gray-200 border-gray-400";
  };

  // Load from Firebase on mount
  useEffect(() => {
    loadItinerary().then((data) => {
      if (data && data.activities && data.activities.length > 0) {
        setActivities(data.activities);
      }
      if (data && data.snapInterval) {
        setSnapInterval(data.snapInterval);
      }
      if (data && data.tripConfig) {
        setTripConfig(data.tripConfig);
      }
      setIsLoaded(true);
    });
  }, []);

  // Auto-refresh from Firebase every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadItinerary().then((data) => {
        if (data && data.activities && data.activities.length > 0) {
          setActivities(data.activities);
        }
        if (data && data.snapInterval) {
          setSnapInterval(data.snapInterval);
        }
        if (data && data.tripConfig) {
          setTripConfig(data.tripConfig);
        }
      });
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Save to Firebase with debounce - ONLY after initial load completes
  useEffect(() => {
    if (!isLoaded) return;

    const timeoutId = setTimeout(() => {
      saveItinerary(activities, snapInterval, tripConfig);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [activities, snapInterval, tripConfig, isLoaded]);

  const addActivity = () => {
    if (!newActivity.name || !newActivity.area || !newActivity.type) {
      let missing = [];
      if (!newActivity.name) missing.push("name");
      if (!newActivity.area) missing.push("area");
      if (!newActivity.type) missing.push("type");
      alert(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    const activity = {
      id: Date.now().toString(),
      ...newActivity,
      scheduledDay: null,
      scheduledTime: null,
    };

    setActivities([...activities, activity]);

    if (!areas.includes(newActivity.area)) {
      setAreas([...areas, newActivity.area]);
    }

    setNewActivity({
      name: "",
      duration: 60,
      area: "",
      type: "",
      description: "",
      url: "",
    });
    setShowAddForm(false);
  };

  const startEditActivity = (activity) => {
    setEditingActivity(activity);
    setNewActivity({
      name: activity.name,
      duration: activity.duration,
      area: activity.area,
      type: activity.type,
      description: activity.description || "",
      url: activity.url || "",
    });
    setShowAddForm(true);
  };

  const updateActivity = () => {
    if (!newActivity.name || !newActivity.area || !newActivity.type) return;

    setActivities(
      activities.map((a) =>
        a.id === editingActivity.id ? { ...a, ...newActivity } : a
      )
    );

    if (!areas.includes(newActivity.area)) {
      setAreas([...areas, newActivity.area]);
    }

    setNewActivity({
      name: "",
      duration: 60,
      area: "",
      type: "",
      description: "",
      url: "",
    });
    setEditingActivity(null);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setNewActivity({
      name: "",
      duration: 60,
      area: "",
      type: "",
      description: "",
      url: "",
    });
    setEditingActivity(null);
    setShowAddForm(false);
  };

  const deleteActivity = (id) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const duplicateActivity = (activity) => {
    const duplicate = {
      ...activity,
      id: Date.now().toString(),
      name: `${activity.name} (copy)`,
      scheduledDay: null,
      scheduledTime: null,
    };
    setActivities([...activities, duplicate]);
  };

  const handleDragStart = (activity) => {
    setDraggedActivity(activity);
  };

  const handleDragOver = (dayIndex, timeSlot, e) => {
    e.preventDefault();
    if (draggedActivity) {
      setDragPreview({ dayIndex, timeSlot });
    }
  };

  const handleDragEnd = () => {
    setDragPreview(null);
  };

  const handleDrop = (dayIndex, timeSlot) => {
    if (!draggedActivity) return;

    const activityDuration = draggedActivity.duration;
    const startMinutes = timeToMinutes(timeSlot);
    const endMinutes = startMinutes + activityDuration;

    const hasConflict = activities.some(
      (a) =>
        a.id !== draggedActivity.id &&
        a.scheduledDay === dayIndex &&
        a.scheduledTime &&
        timesOverlap(a.scheduledTime, a.duration, timeSlot, activityDuration)
    );

    if (hasConflict) {
      alert("Time slot conflict! Choose another time.");
      return;
    }

    setActivities(
      activities.map((a) =>
        a.id === draggedActivity.id
          ? { ...a, scheduledDay: dayIndex, scheduledTime: timeSlot }
          : a
      )
    );
    setDraggedActivity(null);
    setDragPreview(null);
  };

  const removeFromSchedule = (id) => {
    setActivities(
      activities.map((a) =>
        a.id === id ? { ...a, scheduledDay: null, scheduledTime: null } : a
      )
    );
  };

  const handleResizeStart = (activity, edge, e) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingActivity({
      id: activity.id,
      edge,
      startY: e.clientY,
      startDuration: activity.duration,
      startTime: activity.scheduledTime,
      originalStartMinutes: timeToMinutes(activity.scheduledTime),
    });
  };

  const handleResizeMove = (e) => {
    if (!resizingActivity) return;

    const deltaY = e.clientY - resizingActivity.startY;
    const rawMinutes = Math.round(deltaY / snapInterval) * snapInterval;
    const deltaMinutes = rawMinutes;

    setActivities(
      activities.map((a) => {
        if (a.id !== resizingActivity.id) return a;

        if (resizingActivity.edge === "bottom") {
          const newDuration = Math.max(
            snapInterval,
            resizingActivity.startDuration + deltaMinutes
          );
          return { ...a, duration: newDuration };
        } else {
          const newStartMinutes =
            resizingActivity.originalStartMinutes + deltaMinutes;
          const newDuration = Math.max(
            snapInterval,
            resizingActivity.startDuration - deltaMinutes
          );

          const hours = Math.floor(newStartMinutes / 60);
          const mins = newStartMinutes % 60;
          const newStartTime = `${hours.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}`;

          return { ...a, duration: newDuration, scheduledTime: newStartTime };
        }
      })
    );
  };

  const handleResizeEnd = () => {
    setResizingActivity(null);
  };

  useEffect(() => {
    if (resizingActivity) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      return () => {
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizingActivity, snapInterval, activities]);

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const timesOverlap = (time1, duration1, time2, duration2) => {
    const start1 = timeToMinutes(time1);
    const end1 = start1 + duration1;
    const start2 = timeToMinutes(time2);
    const end2 = start2 + duration2;
    return start1 < end2 && start2 < end1;
  };

  const getScheduledActivitiesForSlot = (dayIndex, timeSlot) => {
    return activities.filter((a) => {
      if (a.scheduledDay !== dayIndex || !a.scheduledTime) return false;
      return a.scheduledTime === timeSlot;
    });
  };

  const unscheduledActivities = activities.filter(
    (a) => a.scheduledDay === null || a.scheduledDay === undefined
  );

  const groupedByType = unscheduledActivities.reduce((acc: Record<string, any[]>, activity) => {
    if (!acc[activity.type]) acc[activity.type] = [];
    acc[activity.type].push(activity);
    return acc;
  }, {});

  const ActivityModal = ({ activity, onClose }) => {
    const scheduledLabel = activity.scheduledDay !== null && activity.scheduledDay !== undefined && activity.scheduledTime
      ? `${days[activity.scheduledDay]?.dayOfWeek} ${days[activity.scheduledDay]?.date} at ${formatTime(activity.scheduledTime)}`
      : "Unscheduled";

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className={`${getAreaColor(activity.area)} border-2 rounded-lg shadow-xl p-6 max-w-md w-full mx-4`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title row */}
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 pr-4">{activity.name}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 flex-shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-2 mb-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Clock size={14} className="flex-shrink-0 text-gray-500" />
              <span>{activity.duration} min</span>
              <span className="text-gray-400">·</span>
              <span>{scheduledLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="flex-shrink-0 text-gray-500" />
              <span>{activity.area}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag size={14} className="flex-shrink-0 text-gray-500" />
              <span>{activity.type}</span>
            </div>
          </div>

          {/* Description */}
          {activity.description && (
            <p className="text-sm text-gray-800 mb-4 leading-relaxed">{activity.description}</p>
          )}

          {/* URL */}
          {activity.url && (
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              <ExternalLink size={14} />
              Open link
            </a>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-black border-opacity-10">
            <button
              onClick={() => { startEditActivity(activity); onClose(); }}
              className="flex items-center gap-1 text-sm bg-white bg-opacity-60 hover:bg-opacity-100 px-3 py-1.5 rounded border border-gray-300"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={() => { duplicateActivity(activity); onClose(); }}
              className="flex items-center gap-1 text-sm bg-white bg-opacity-60 hover:bg-opacity-100 px-3 py-1.5 rounded border border-gray-300"
            >
              <Copy size={14} /> Duplicate
            </button>
            {(activity.scheduledDay !== null && activity.scheduledDay !== undefined) && (
              <button
                onClick={() => { removeFromSchedule(activity.id); onClose(); }}
                className="flex items-center gap-1 text-sm bg-white bg-opacity-60 hover:text-red-700 hover:bg-opacity-100 px-3 py-1.5 rounded border border-gray-300"
              >
                <Trash2 size={14} /> Unschedule
              </button>
            )}
            <button
              onClick={() => { if (window.confirm(`Delete "${activity.name}"?`)) { deleteActivity(activity.id); onClose(); } }}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 bg-white bg-opacity-60 hover:bg-opacity-100 px-3 py-1.5 rounded border border-red-200 ml-auto"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-gray-50 p-4 overflow-hidden flex flex-col">
      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              {tripConfig.tripName}
            </h1>
            <button
              onClick={() => setShowTripSettings(!showTripSettings)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-300 rounded px-2 py-1"
            >
              {showTripSettings ? "▲ settings" : "▼ settings"}
            </button>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 items-center bg-white px-3 py-2 rounded border">
              <span className="text-sm font-medium">Snap:</span>
              {[15, 30, 60].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setSnapInterval(interval)}
                  className={`px-3 py-1 rounded text-sm ${
                    snapInterval === interval
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {interval}min
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
            >
              <Plus size={20} />
              Add Activity
            </button>
          </div>
        </div>

        {/* Trip Settings Panel */}
        {showTripSettings && (
          <div className="mt-3 bg-white border rounded p-4 flex gap-6 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trip Name</label>
              <input
                type="text"
                value={tripConfig.tripName}
                onChange={(e) => setTripConfig({ ...tripConfig, tripName: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm w-48"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={tripConfig.startDate}
                onChange={(e) => setTripConfig({ ...tripConfig, startDate: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Number of Days</label>
              <input
                type="number"
                min={1}
                max={14}
                value={tripConfig.numDays}
                onChange={(e) => {
                  const num = Math.max(1, Math.min(14, parseInt(e.target.value) || 1));
                  setTripConfig({ ...tripConfig, numDays: num });
                }}
                className="border rounded px-3 py-1.5 text-sm w-20"
              />
            </div>
            <div className="text-xs text-gray-400 pb-2">
              ⚠️ Changing days won't delete scheduled activities — they'll just show unscheduled if their day no longer exists.
            </div>
          </div>
        )}
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="bg-white p-4 rounded border mb-4">
          <h3 className="font-semibold mb-3">
            {editingActivity ? "Edit Activity" : "New Activity"}
          </h3>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <input
              type="text"
              placeholder="Activity name"
              value={newActivity.name}
              onChange={(e) =>
                setNewActivity({ ...newActivity, name: e.target.value })
              }
              className="border rounded px-3 py-2"
            />
            <input
              type="number"
              placeholder="Duration (min)"
              value={newActivity.duration}
              onChange={(e) =>
                setNewActivity({
                  ...newActivity,
                  duration: parseInt(e.target.value) || 0,
                })
              }
              className="border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Area (e.g., Downtown)"
              value={newActivity.area}
              onChange={(e) =>
                setNewActivity({ ...newActivity, area: e.target.value })
              }
              list="areas"
              className="border rounded px-3 py-2"
            />
            <datalist id="areas">
              {areas.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
            <select
              value={newActivity.type}
              onChange={(e) => {
                const selectedType = e.target.value;
                const defaultDuration = typeDurationDefaults[selectedType];
                setNewActivity({
                  ...newActivity,
                  type: selectedType,
                  // Only apply default if user hasn't changed from the initial 60min default
                  duration: newActivity.duration === 60 && defaultDuration ? defaultDuration : newActivity.duration,
                });
              }}
              className="border rounded px-3 py-2"
            >
              <option value="">Select type</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Description (optional)"
            value={newActivity.description}
            onChange={(e) =>
              setNewActivity({ ...newActivity, description: e.target.value })
            }
            className="border rounded px-3 py-2 w-full mb-3"
            rows={2}
          />
          <input
            type="url"
            placeholder="URL (optional - e.g., https://example.com)"
            value={newActivity.url}
            onChange={(e) =>
              setNewActivity({ ...newActivity, url: e.target.value })
            }
            className="border rounded px-3 py-2 w-full"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={editingActivity ? updateActivity : addActivity}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              {editingActivity ? "Update" : "Add"}
            </button>
            <button
              onClick={cancelEdit}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Activity Cards */}
        <div className="w-80 bg-white rounded border p-4 overflow-y-auto">
          <h2 className="font-semibold mb-3 text-lg">Activities</h2>
          {(Object.entries(groupedByType) as [string, any[]][]).map(([type, typeActivities]) => (
            <div key={type} className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{type}</h3>
              {typeActivities.map((activity) => (
                <div
                  key={activity.id}
                  draggable
                  onDragStart={() => handleDragStart(activity)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedActivity(activity)}
                  className={`${getAreaColor(
                    activity.area
                  )} border-2 rounded p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">
                          {activity.name}
                        </div>
                        {activity.url && (
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800"
                            title="Open link"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {activity.duration}min • {activity.area}
                      </div>
                      {activity.description && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          {activity.description.length > 60
                            ? `${activity.description.substring(0, 60)}...`
                            : activity.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditActivity(activity);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateActivity(activity);
                        }}
                        className="text-green-500 hover:text-green-700 p-1"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteActivity(activity.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {unscheduledActivities.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              {isLoaded ? "All activities scheduled!" : "Loading..."}
            </p>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded border overflow-auto">
          <div className="inline-block min-w-full">
            {/* Day Headers */}
            <div className="flex sticky top-0 bg-white z-10 border-b">
              <div className="w-20 flex-shrink-0 border-r bg-gray-50 sticky left-0 z-20"></div>{" "}
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 min-w-[180px] p-3 text-center border-r"
                >
                  <div className="font-semibold">{day.date}</div>
                  <div className="text-xs text-gray-500">{day.dayOfWeek}</div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            {allDisplayTimes.map((time, timeIdx) => {
              const nextTime = allDisplayTimes[timeIdx + 1];
              const currentMinutes = timeToMinutes(time);
              const nextMinutes = nextTime ? timeToMinutes(nextTime) : currentMinutes + snapInterval;
              const rowHeight = `${nextMinutes - currentMinutes}px`;

              return (
                <div
                  key={timeIdx}
                  className="flex border-b"
                  style={{ height: rowHeight }}
                >
                  <div className="w-20 flex-shrink-0 border-r bg-gray-50 px-2 py-1 text-xs text-gray-600 sticky left-0 z-20">
                    {formatTime(time)}
                  </div>
                  {days.map((day, dayIdx) => {
                    const activitiesToRender = getScheduledActivitiesForSlot(
                      dayIdx,
                      time
                    );
                    const showPreview =
                      dragPreview &&
                      dragPreview.dayIndex === dayIdx &&
                      dragPreview.timeSlot === time &&
                      draggedActivity;

                    return (
                      <div
                        key={dayIdx}
                        className="flex-1 min-w-[180px] border-r relative"
                        onDragOver={(e) => handleDragOver(dayIdx, time, e)}
                        onDrop={() => handleDrop(dayIdx, time)}
                      >
                        {/* Render scheduled activities */}
                        {activitiesToRender.map((activity) => (
                          <div
                            key={activity.id}
                            draggable={
                              !resizingActivity ||
                              resizingActivity.id !== activity.id
                            }
                            onDragStart={(e) => {
                              if (resizingActivity) {
                                e.preventDefault();
                                return;
                              }
                              e.stopPropagation();
                              handleDragStart(activity);
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              if (!resizingActivity) {
                                e.stopPropagation();
                                setSelectedActivity(activity);
                              }
                            }}
                            className={`absolute inset-x-1 ${getAreaColor(
                              activity.area
                            )} border-2 rounded p-2 cursor-pointer group overflow-hidden`}
                            style={{
                              height: `${activity.duration}px`,
                              zIndex: 5,
                            }}
                          >
                            {/* Top resize handle */}
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-gray-900 hover:bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onMouseDown={(e) => {
                                handleResizeStart(activity, "top", e);
                              }}
                            />

                            <div className="flex items-center gap-1">
                              <div className="text-xs font-medium">
                                {activity.name}
                              </div>
                              {activity.url && (
                                <a
                                  href={activity.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Open link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {activity.duration}min
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {activity.area}
                            </div>
                            {activity.description && (
                              <div className="text-xs text-gray-400 mt-1 italic">
                                {activity.description.length > 40
                                  ? `${activity.description.substring(
                                      0,
                                      40
                                    )}...`
                                  : activity.description}
                              </div>
                            )}

                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateActivity(activity);
                                }}
                                className="text-green-600 hover:text-green-800 bg-white rounded p-0.5"
                                title="Duplicate"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromSchedule(activity.id);
                                }}
                                className="text-red-600 hover:text-red-800 bg-white rounded p-0.5"
                                title="Remove from schedule"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {/* Bottom resize handle */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-gray-900 hover:bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onMouseDown={(e) => {
                                handleResizeStart(activity, "bottom", e);
                              }}
                            />
                          </div>
                        ))}

                        {/* Render drag preview */}
                        {showPreview && (
                          <div
                            className={`absolute inset-x-1 ${getAreaColor(
                              draggedActivity.area
                            )} border-2 border-dashed rounded p-2 opacity-60 pointer-events-none`}
                            style={{
                              height: `${draggedActivity.duration}px`,
                              zIndex: 10,
                            }}
                          >
                            <div className="text-xs font-medium">
                              {draggedActivity.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {draggedActivity.duration}min
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {draggedActivity.area}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryPlanner;
