import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { authenticatedFetch } from "../utils/auth";
import { toast } from "react-toastify";
import API_URL from "../utils/apiConfig";
import { FaChartLine } from "react-icons/fa";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ReportsChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("weeks"); // Default to weeks
  const [periodData, setPeriodData] = useState(null);

  const fetchChartData = async (period) => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(
        `${API_URL}/reports/analytics/timeline?period=${period}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch chart data");
      }

      const data = await response.json();
      setPeriodData(data);
      processChartData(data);
    } catch (err) {
      console.error("Error fetching chart data:", err);
      setError(err.message);
      // Generate mock data for development if API endpoint doesn't exist
      generateMockData(period);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(selectedPeriod);
  }, [selectedPeriod]);

  const generateMockData = (period) => {
    let labels = [];
    let counts = [];

    if (period === "days") {
      // Generate mock data for the last 30 days
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
        counts.push(Math.floor(Math.random() * 8) + 1);
      }
    } else if (period === "weeks") {
      // Generate mock data for the last 8 weeks
      const today = new Date();
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - i * 7 - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        labels.push(
          `${weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} - ${weekEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`
        );
        counts.push(Math.floor(Math.random() * 15) + 2);
      }
    } else if (period === "months") {
      // Generate mock data for the last 6 months
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(
          today.getFullYear(),
          today.getMonth() - i,
          1
        );
        labels.push(
          monthDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        );
        counts.push(Math.floor(Math.random() * 50) + 10);
      }
    }

    const processedData = {
      labels: labels,
      datasets: [
        {
          label: "Erstellte Berichte",
          data: counts,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#1E40AF",
          pointHoverBackgroundColor: "#60A5FA",
          pointHoverBorderColor: "#1E40AF",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ],
    };

    setChartData(processedData);
  };

  const processChartData = (data) => {
    // Process the API data into chart format
    const processedData = {
      labels: data.labels || [],
      datasets: [
        {
          label: "Erstellte Berichte",
          data: data.counts || [],
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#1E40AF",
          pointHoverBackgroundColor: "#60A5FA",
          pointHoverBorderColor: "#1E40AF",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ],
    };

    setChartData(processedData);
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#E5E7EB",
          font: {
            size: 12,
            weight: "500",
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#F3F4F6",
        bodyColor: "#E5E7EB",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return `Zeitraum: ${context[0].label}`;
          },
          label: (context) => {
            return `Berichte: ${context.parsed.y}`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    scales: {
      x: {
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
          drawBorder: false,
        },
        ticks: {
          color: "#9CA3AF",
          font: {
            size: 10,
          },
          maxRotation: 45,
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
          drawBorder: false,
        },
        ticks: {
          color: "#9CA3AF",
          font: {
            size: 10,
          },
          stepSize: 1,
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 2,
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FaChartLine className="text-xl text-green-400" />
            <h2 className="text-xl font-bold text-green-400">
              Bericht Analytik
            </h2>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-gray-400">Lade Chart-Daten...</p>
        </div>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FaChartLine className="text-xl text-green-400" />
            <h2 className="text-xl font-bold text-green-400">
              Bericht Analytik
            </h2>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center">
          <p className="text-red-400">Fehler beim Laden der Chart-Daten</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FaChartLine className="text-xl text-green-400" />
          <h2 className="text-xl font-bold text-green-400">Bericht Analytik</h2>
          {periodData && (
            <span className="text-sm text-gray-400">({periodData.period})</span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePeriodChange("days")}
            className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
              selectedPeriod === "days"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Tage
          </button>
          <button
            onClick={() => handlePeriodChange("weeks")}
            className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
              selectedPeriod === "weeks"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Wochen
          </button>
          <button
            onClick={() => handlePeriodChange("months")}
            className={`px-3 py-1 text-xs rounded-md transition-colors duration-200 ${
              selectedPeriod === "months"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Monate
          </button>
        </div>
      </div>
      <div className="h-48">
        {chartData && <Line data={chartData} options={options} />}
      </div>
      {periodData && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Gesamt: {periodData.total_reports} Berichte
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsChart;
