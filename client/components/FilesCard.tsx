import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ButtonLoading } from "@/components/loading-button";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function FilesCard({ file }: { file: any }) {
  const [loading, setLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (file_id: string) => {
      const res = await fetch(`${API_URL}/file/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_id,
        }),
      });

      return res;
    },
    onSuccess(data, variables, context) {},
  });

  const cleanMutation = useMutation({
    mutationFn: async (file_id: string) => {
      const res = await fetch(`/api/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_id,
        }),
      });

      return res;
    },
    onSuccess: () => {
      setIsCleaning(false);
      queryClient.invalidateQueries({
        queryKey: ["files"],
      });
    },
  });

  const calculateBounceRateRiskColor = (bounceRate: number) => {
    if (bounceRate < 40) {
      return "text-green-600";
    } else if (bounceRate >= 40 && bounceRate < 60) {
      return "text-yellow-600";
    } else {
      return "text-red-600";
    }
  };

  const _handleOnClick = async () => {
    setIsCleaning(true);
    const file_id = file.id;

    try {
      const response = await fetch(`/api/files`, {
        method: "POST",
        body: JSON.stringify({ file_id }),
      });

      const data = await response.json();

      if (response.status === 200) {
        setIsCleaning(false);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const _handleClickDownload = async () => {
    const file_id = file.id;
    setLoading(true);
    try {
      const response = await mutation.mutateAsync(file_id);

      if (response.status === 200) {
        const downloadResponse = await response.json();

        const urlToDownload = downloadResponse.url;

        setLoading(false);

        window.open(urlToDownload, "_blank");
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="overflow-hidden bg-white px-4 py-4 shadow sm:rounded-md sm:px-6 flex">
      <div className="w-1/5 flex flex-col justify-center items-center">
        <p className="text-md font-bold">{file.originalFileName}</p>

        <span className="text-sm">{`size: 10MB`}</span>
      </div>

      <div className="w-1/5 flex flex-col">
        <div>
          <span className="text-sm font-medium">Total Records</span>:{" "}
          <span className="text-sm font-normal">{file.totalEmails}</span>
        </div>

        <div>
          <span className="text-sm font-medium">Status</span>:{" "}
          <span className="text-sm font-normal">Finished</span>
        </div>

        <div>
          <span className="text-sm font-medium">Valid Emails</span>:{" "}
          <span className="text-sm font-normal">{file.cleanEmails}</span>
        </div>
      </div>

      <div className="w-2/5 border shadow rounded-md flex items-center justify-center space-x-4">
        <p className="font-bold text-lg">Estimated Bounce Rate:</p>
        <span
          className={`font-bold text-lg ${calculateBounceRateRiskColor(
            file.bounceRate
          )}`}
        >
          {Math.round(file.bounceRate)}%
        </span>
      </div>

      <div className="w-1/5 flex justify-around items-center">
        {file.state === "finished" && isCleaning ? (
          <ButtonLoading> Cleaning list... </ButtonLoading>
        ) : file.state === "finished" ? (
          <Button variant={"secondary"} onClick={_handleOnClick} type="button">
            Clean List
          </Button>
        ) : null}

        {loading ? (
          <ButtonLoading> Downloading... </ButtonLoading>
        ) : (
          file.state === "processed" && (
            <Button
              variant={"default"}
              type="button"
              onClick={_handleClickDownload}
            >
              Download
            </Button>
          )
        )}
      </div>
    </div>
  );
}
