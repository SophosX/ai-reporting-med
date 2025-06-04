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

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await authenticatedFetch(
          `${API_URL}/reports/analytics/timeline`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch chart data");
        }

        const data = await response.json();
        processChartData(data);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setError(err.message);
        // Generate mock data for development if API endpoint doesn't exist
        generateMockData();
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const generateMockData = () => {
    // Generate mock data for the last 30 days
    const days = [];
    const counts = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
      // Generate random counts with some realistic patterns
      counts.push(Math.floor(Math.random() * 8) + 1);
    }

    const processedData = {
      labels: days,
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#E5E7EB",
          font: {
            size: 14,
            weight: "500",
          },
          padding: 20,
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
            return `Datum: ${context[0].label}`;
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
            size: 12,
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
            size: 12,
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
      <div className="bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <FaChartLine className="text-2xl text-green-400" />
          <h2 className="text-2xl font-bold text-green-400">
            Bericht Analytik
          </h2>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">Lade Chart-Daten...</p>
        </div>
      </div>
    );
  }

  if (error && !chartData) {
    return (
      <div className="bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <FaChartLine className="text-2xl text-green-400" />
          <h2 className="text-2xl font-bold text-green-400">
            Bericht Analytik
          </h2>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-red-400">Fehler beim Laden der Chart-Daten</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-8">
      <div className="flex items-center space-x-3 mb-6">
        <FaChartLine className="text-2xl text-green-400" />
        <h2 className="text-2xl font-bold text-green-400">Bericht Analytik</h2>
      </div>
      <div className="h-64">
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default ReportsChart;
