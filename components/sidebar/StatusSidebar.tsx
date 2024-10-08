import Link from "next/link";
import {
  Menubar,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "../ui/menubar";
import { signOut, useSession } from "next-auth/react";

export default function StatusSidebar() {
  const { data: session, status } = useSession();

  return (
    <Menubar className="bottom-0 fixed w-[345px] flex justify-center bg-emerald-200 shadow-inner">
      <MenubarMenu>
        <div className="font-bold pr-2 hover:bg-emerald-300 rounded pl-2">
          <Link href="/">Notility</Link>
        </div>
      </MenubarMenu>
      <MenubarMenu>
        {session ? (
          <img className="rounded-full h-5 w-5" src={session.user.image} />
        ) : (
          <div></div>
        )}
      </MenubarMenu>
      <MenubarMenu>
        {session ? (
          <div className="w-[175px] pl-2">
            <span className="text-xs  truncate ...  block">
              {session.user.email}
            </span>
          </div>
        ) : (
          <div>
            {" "}
            <MenubarTrigger>
              <Link href="/api/auth/signin" legacyBehavior>
                Log In
              </Link>
            </MenubarTrigger>
          </div>
        )}
      </MenubarMenu>
      <MenubarSeparator />
      <MenubarMenu>
        {session ? (
          <MenubarTrigger
            onClick={() => signOut()}
            className="text-sm inline-block whitespace-nowrap hover:bg-emerald-300"
          >
            Log Out
          </MenubarTrigger>
        ) : (
          <div></div>
        )}
      </MenubarMenu>
    </Menubar>
  );
}
