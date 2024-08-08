import React, { useState } from "react";
import { GetServerSideProps } from "next";
import { useSession, getSession } from "next-auth/react";
import Layout from "../components/Layout";
import { PostProps } from "../components/Post";
import prisma from "../lib/prisma";
import Router from "next/router";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../components/ui/resizable";

// refactored components:
import Sidebar from "../components/Sidebar";
import Tiptap from "../components/notes/tiptap/Tiptap";
import Chat from "../components/notes/chat/Chat";

// retrieve notes and messages with chatbot, don't need to fetch both if only one is needed...
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    res.statusCode = 403;
    return { props: { notes: [] } };
  }

  const notes = await prisma.notes.findMany({
    where: {
      author: { email: session?.user?.email },
    },
  });

  const messages = await prisma.message.findMany({
    where: { authorId: (session as any).id },
  });

  return {
    props: { notes, messages },
  };
};

export type Props = {
  notes: PostProps[];
  messages: any;
};

const Notes: React.FC<Props> = (props) => {
  const { data: session } = useSession();
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [chatSelected, setChatSelected] = useState(false);

  // saves notes to db
  const saveNotes = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    try {
      const body = { title, content };
      await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await Router.push("/notes");
    } catch (error) {
      console.error(error);
    }
  };

  // for updating title in sidebar
  const maintainTitle = (e: React.SyntheticEvent) => {
    if (initialEdit) {
      setMaintainedTitle((e.target as HTMLElement).innerText);
      setInitialEdit(false);
    }
  };

  // tracks currently editted title to ensure update in db
  const [initialEdit, setInitialEdit] = useState(true);
  const [maintainedTitle, setMaintainedTitle] = useState("");

  const updateNote = async (e: React.SyntheticEvent, newTitle, newContent) => {
    e.preventDefault();
    if (newTitle === title) {
      return;
    }
    try {
      const title = newTitle;
      const content = newContent;
      const oldTitle = maintainedTitle;
      const body = { title, content, oldTitle };

      await fetch("/api/notes/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setInitialEdit(true);
      setTitle(newTitle);
      await Router.push("/notes");
    } catch (error) {
      console.error(error);
    }
  };

  // look at currently displayed props.note and make new note accordingly
  //      works as we refresh on every update, however this is api-call intensive
  //      look into caching or more performant way of updating (on save or something)
  //          basically iterates through "New Note"(s) in current props and appends 1st after gap
  const createNewNote = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    let numberMap = new Map<number, number>();
    numberMap.set(0, 1);
    let index = 1;
    for (let i = 0; i < props.notes.length; i++) {
      let currTitle = props.notes[i].title;
      if (currTitle.startsWith("New Note ")) {
        currTitle = currTitle.replace("New Note ", "");
        if (!Number.isNaN(parseInt(currTitle))) {
          numberMap.set(parseInt(currTitle), 1);
          while (numberMap.has(index)) {
            index++;
            if (index == 10) break; // limit notes to 10, remove this **
          }
        }
      }
    }
    try {
      const title = "New Note " + index;
      const content = "New Note";
      const body = { title, content };
      await fetch("/api/notes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await Router.push("/notes");
    } catch (error) {
      console.error(error);
    }
  };

  // currently we use search for db which we dont wanna stick with (use more logic)
  const loadNotes = async (e: React.SyntheticEvent, title: string) => {
    console.log("loading");
    const res = await fetch("/api/notes/load/" + title, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    setTitle(data.title);
    setContent(data.content);

    await Router.push("/notes");
    return false;
  };

  const deleteNotes = async (e: React.SyntheticEvent, title: string) => {
    e.preventDefault();
    const res = await fetch("/api/notes/delete/" + title, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setTitle("");
    setContent("");
    await Router.push("/notes");
  };

  if (!session) {
    return (
      <Layout>
        <h1>My Notes</h1>
        <div>You need to be authenticated to view this page.</div>
      </Layout>
    );
  }

  if (chatSelected) {
    return (
      <Layout>
        <div className="page">
          <ResizablePanelGroup direction="horizontal" className="fixed ">
            <ResizablePanel
              minSize={20}
              maxSize={20}
              defaultSize={20}
              className="rounded-lg border"
            >
              <Sidebar
                title={title}
                setTitle={setTitle}
                setContent={setContent}
                createNewNote={createNewNote}
                updateNote={updateNote}
                maintainTitle={maintainTitle}
                loadNotes={loadNotes}
                props={props}
              />
            </ResizablePanel>
            <ResizableHandle />

            <ResizablePanel>
              <ResizablePanelGroup direction="vertical">
                {/* perfect scrolling method */}
                <Chat messagesLoaded={props.messages} />
                {/* <div className="bottom-0 fixed h-10 w-screen bg-white border">
                  Here
                </div> */}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <div className="page">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel minSize={20} maxSize={20} defaultSize={20}>
              <Sidebar
                title={title} // state of currently loaded title in notes
                setTitle={setTitle} // usestate for currently loaded title
                setContent={setContent} //  set body of current text
                createNewNote={createNewNote} // create new note
                updateNote={updateNote} // think its just for title update
                maintainTitle={maintainTitle} // necessary
                loadNotes={loadNotes} // onclick
                props={props} //...
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel>
              <ResizablePanelGroup direction="vertical">
                <Tiptap
                  setTitle={setTitle}
                  title={title}
                  setContent={setContent}
                  content={content}
                  saveNotes={saveNotes}
                  deleteNotes={deleteNotes}
                />
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Layout>
    );
  }
};

export default Notes;
