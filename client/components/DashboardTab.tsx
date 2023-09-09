import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FilesCard from "./FilesCard";

export default function DashboardTab({ files }: { files: any[] }) {
  const finishedFiles = files.filter((file: any) => file.state === "finished");

  const progressingFiles = files.filter(
    (file: any) => file.state === "in-progress"
  );

  const processedFiles = files.filter(
    (file: any) => file.state === "processed"
  );

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">{`All(${files.length})`}</TabsTrigger>
        <TabsTrigger value="finished">{`Uploaded(${finishedFiles.length})`}</TabsTrigger>
        <TabsTrigger value="processed">{`Processed(${processedFiles.length})`}</TabsTrigger>
        <TabsTrigger value="progress">{`In-progress(${progressingFiles.length})`}</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="py-4">
        <div className="space-y-3">
          {files &&
            files.map((file: any, index: number) => (
              <FilesCard file={file} key={index} />
            ))}
        </div>
      </TabsContent>
      <TabsContent value="finished" className="py-4">
        {" "}
        <div className="space-y-3">
          {finishedFiles &&
            finishedFiles.map((file: any, index: number) => (
              <FilesCard file={file} key={index} />
            ))}
        </div>
      </TabsContent>

      <TabsContent value="progress" className="py-4">
        <div className="space-y-3">
          {progressingFiles &&
            progressingFiles.map((file: any, index: number) => (
              <FilesCard file={file} key={index} />
            ))}
        </div>
      </TabsContent>

      <TabsContent value="processed" className="py-4">
        <div className="space-y-3">
          {processedFiles &&
            processedFiles.map((file: any, index: number) => (
              <FilesCard file={file} key={index} />
            ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
