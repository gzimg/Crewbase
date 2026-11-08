import type { GetServerSideProps } from "next";

/** /workspace/[id]/team opens the Announcements tab. */
export const getServerSideProps: GetServerSideProps = async (context) => ({
  redirect: { destination: `/workspace/${context.query.id}/team/announcements`, permanent: false },
});

export default function TeamIndex() {
  return null;
}
