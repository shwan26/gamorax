"use client";

import Navbar from "../../../../../../components/Navbar";

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="flex px-6 mt-4">
        <div className="w-40 flex flex-col gap-6 text-lg">
          <a>Add File</a>
          <a>Timer</a>
          <a className="font-bold text-blue-700">Report</a>
        </div>

        <div className="flex-1 px-10">
          <table className="w-full text-left">
            <thead>
              <tr className="font-bold text-blue-700">
                <th>Student ID</th>
                <th>Name</th>
                <th>Score</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>6530187</td>
                <td>Shwan Myat Nay Chi</td>
                <td>20/20</td>
              </tr>
              <tr>
                <td>6530181</td>
                <td>Naw Tulip</td>
                <td>20/20</td>
              </tr>
              <tr>
                <td>6530143</td>
                <td>Min Thuka</td>
                <td>15/20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
