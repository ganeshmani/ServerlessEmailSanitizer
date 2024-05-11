"use client";
import { useQuery } from "@tanstack/react-query";

import DashboardTab from "@/components/DashboardTab";
import Loader from "@/components/ui/loader";
import {
  FormEvent,
  MouseEvent,
  MouseEventHandler,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { ButtonLoading } from "@/components/loading-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function Dashboard() {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);

  const { isLoading, data, isError, isFetched, isFetching, isSuccess } =
    useQuery({
      queryKey: ["files"],
      queryFn: async () => {
        const res = await fetch(`${API_URL}/files`);
        const data = await res.json();
        return data;
      },
      refetchInterval: 2000,
    });

  // }

  const onDrop = useCallback((acceptedFiles: any) => {
    // Do something with the files
    console.log("acceptedFiles", acceptedFiles);

    setFiles(acceptedFiles);
  }, []);

  const handleFileUpload = async (e: MouseEvent<HTMLElement>) => {
    setIsUploading(true);
    const input = ref.current!;

    const file: File = files[0];

    const res = await fetch(`${API_URL}/get-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_name: file.name,
        content_type: file.type,
        size: file.size,
      }),
    });

    const data = await res.json();

    const url = data.url;

    const xhr = new XMLHttpRequest();

    // Listen for the progress event
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: percentComplete,
        }));
      }
    });

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: percentComplete,
        }));
      }
    };

    xhr.send(file);

    // update setIsUploading to false after upload is complete
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        setIsUploading(false);
      }
    };
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="w-full py-8" {...getRootProps()}>
        <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
          <span className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="font-medium text-gray-600">
              Drop your files here
            </span>
          </span>
          <input
            type="file"
            {...getInputProps()}
            ref={ref}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            name="file_upload"
            className="hidden"
          />
        </label>
      </div>
      <div className="flex w-full justify-center">
        {isUploading ? (
          <ButtonLoading
            disabled={true}
            className="px-2 py-1 w-96 rounded-md content-end flex	align-right"
          >
            Uploading...
          </ButtonLoading>
        ) : (
          <Button
            type="button"
            disabled={isUploading}
            onClick={handleFileUpload}
            className="px-2 py-1 w-96 rounded-md content-end flex	align-right"
          >
            Upload
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-4">
          <Loader />
        </div>
      ) : (
        <div className="w-full py-8">
          <DashboardTab files={data.files} />
        </div>
      )}
    </div>
  );
}
