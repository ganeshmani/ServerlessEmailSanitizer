import { NextResponse } from "next/server";

const API_URL = "https://owr5xv86b4.execute-api.us-east-1.amazonaws.com/";
export async function GET() {
  try {
    const response = await fetch(`${API_URL}/files`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: {
        revalidate: 1,
      },
    });
    const data = await response.json();
    console.log("data", data);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.error();
  }
}

export async function POST(req: Request) {
  const { file_id } = await req.json();

  try {
    const response = await fetch(`${API_URL}/clean-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_id }),
    });
    const data = await response.json();

    if (response.status === 200) {
      return NextResponse.json(data);
    }
  } catch (err) {
    return NextResponse.error();
  }
}
