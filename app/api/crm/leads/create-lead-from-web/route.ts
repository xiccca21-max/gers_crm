import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyNextCrmWebhookToken } from "@/lib/verify-webhook-token";

export async function POST(req: Request) {
  if (req.headers.get("content-type") !== "application/json") {
    return NextResponse.json(
      { message: "Invalid content-type" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const headers = req.headers;

  if (!body) {
    return NextResponse.json({ message: "No body" }, { status: 400 });
  }
  if (!headers) {
    return NextResponse.json({ message: "No headers" }, { status: 400 });
  }

  const { firstName, lastName, account, job, email, phone, lead_source } = body;

  //Validate auth with token from .env.local
  const token = headers.get("authorization");

  if (!verifyNextCrmWebhookToken(token)) {
    if (!process.env.NEXTCRM_TOKEN?.trim()) {
      return NextResponse.json(
        { message: "NEXTCRM_TOKEN not defined in environment" },
        { status: 401 },
      );
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  } else {
    if (!lastName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    try {
      await prismadb.crm_Leads.create({
        data: {
          v: 1,
          firstName,
          lastName,
          company: account,
          jobTitle: job,
          email,
          phone,
        },
      });

      return NextResponse.json({ message: "New lead created successfully" });
      //return res.status(200).json({ json: "newContact" });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { message: "Error creating new lead" },
        { status: 500 }
      );
    }
  }
}
