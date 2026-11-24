import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDTAvatarUrl } from "@/lib/dt-avatars";
import { calcularPuntajeDT, formatearPuntos } from "@/lib/puntaje-dt";

const BUCKET = "dt-card-archives";
const CARD_WIDTH = 680;
const CARD_HEIGHT = 1100;
const PDF_SCALE = 0.6;
const PDF_WIDTH = CARD_WIDTH * PDF_SCALE;
const PDF_HEIGHT = CARD_HEIGHT * PDF_SCALE;

type MatchInfo = {
  id: string;
  group_id: string;
  season_id: string;
  number: number;
  kickoff_at: string;
};

type Pick = { team_id: string; member_id: string; slot: string };
type CardPlayer = { alias: string; points: number; isSuplente: boolean };
type DtCard = {
  alias: string;
  nombre: string;
  photoUrl: string | null;
  points: number;
  titulares: CardPlayer[];
  suplente: CardPlayer | null;
};

const MEDALLAS = [
  "medalla-oro.png",
  "medalla-plata.png",
  "medalla-bronce.png",
] as const;

export async function generarPdfPodioFecha(
  supabase: SupabaseClient,
  match: MatchInfo
): Promise<{ path: string; cartas: number }> {
  const [
    { data: teams, error: teamsError },
    { data: dtScores, error: dtScoresError },
  ] = await Promise.all([
    supabase
      .from("fantasy_teams")
      .select("id, dt_member_id")
      .eq("match_id", match.id),
    supabase
      .from("dt_scores")
      .select("dt_member_id, points")
      .eq("match_id", match.id),
  ]);
  if (teamsError) throw teamsError;
  if (dtScoresError) throw dtScoresError;
  if (!teams?.length && !dtScores?.length) return { path: "", cartas: 0 };

  const { data: picksRaw, error: picksError } =
    teams && teams.length > 0
      ? await supabase
          .from("fantasy_picks")
          .select("team_id, member_id, slot")
          .in(
            "team_id",
            teams.map((team) => team.id)
          )
      : { data: [], error: null };
  if (picksError) throw picksError;
  const picks = (picksRaw ?? []) as Pick[];

  const memberIds = new Set([
    ...(teams ?? []).map((team) => team.dt_member_id),
    ...(dtScores ?? []).map((score) => score.dt_member_id),
  ]);
  for (const pick of picks) memberIds.add(pick.member_id);

  const [{ data: members, error: membersError }, { data: scores, error: scoresError }] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("id, display_name, user_id")
        .eq("group_id", match.group_id)
        .in("id", Array.from(memberIds)),
      supabase
        .from("player_scores")
        .select("member_id, points")
        .eq("match_id", match.id),
    ]);
  if (membersError) throw membersError;
  if (scoresError) throw scoresError;

  const userIds = (members ?? [])
    .map((member) => member.user_id)
    .filter((userId): userId is string => !!userId);
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, real_name, photo_url")
          .in("id", userIds)
      : { data: [], error: null };
  if (profilesError) throw profilesError;

  const profilesByUser = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );
  const membersById = new Map(
    (members ?? []).map((member) => {
      const profile = member.user_id
        ? profilesByUser.get(member.user_id)
        : null;
      return [
        member.id,
        {
          alias: member.display_name,
          nombre: profile?.real_name?.trim() ?? "",
          photoUrl: profile?.photo_url ?? null,
        },
      ];
    })
  );
  const scoreByMember = new Map(
    (scores ?? []).map((score) => [score.member_id, score.points])
  );
  const picksByTeam = new Map<string, Pick[]>();
  for (const pick of picks) {
    if (!picksByTeam.has(pick.team_id)) picksByTeam.set(pick.team_id, []);
    picksByTeam.get(pick.team_id)!.push(pick);
  }

  const teamsByDt = new Map(
    (teams ?? []).map((team) => [team.dt_member_id, team])
  );
  const fallbackScores = new Map(
    (dtScores ?? []).map((score) => [score.dt_member_id, score.points])
  );
  const dtMemberIds = new Set([
    ...teamsByDt.keys(),
    ...fallbackScores.keys(),
  ]);
  const cards = Array.from(dtMemberIds)
    .map((dtMemberId) => {
      const team = teamsByDt.get(dtMemberId);
      const teamPicks = team ? picksByTeam.get(team.id) ?? [] : [];
      const titulares = teamPicks
        .filter((pick) => pick.slot === "titular")
        .map((pick) => ({
          alias: membersById.get(pick.member_id)?.alias ?? "—",
          points: scoreByMember.get(pick.member_id) ?? 0,
          isSuplente: false,
        }));
      const suplentePick = teamPicks.find(
        (pick) => pick.slot === "suplente"
      );
      const suplente = suplentePick
        ? {
            alias:
              membersById.get(suplentePick.member_id)?.alias ?? "—",
            points: scoreByMember.get(suplentePick.member_id) ?? 0,
            isSuplente: true,
          }
        : null;
      const dt = membersById.get(dtMemberId);

      return {
        alias: dt?.alias ?? "—",
        nombre: dt?.nombre ?? "",
        photoUrl: dt?.photoUrl ?? null,
        points: team
          ? calcularPuntajeDT(
              teamPicks.map((pick) => ({
                slot: pick.slot,
                points: scoreByMember.get(pick.member_id) ?? 0,
              }))
            )
          : fallbackScores.get(dtMemberId) ?? 0,
        titulares,
        suplente,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 3) as DtCard[];

  if (cards.length === 0) return { path: "", cartas: 0 };

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [background, logo, ...medallas] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "cards", "carta-fondo.png")),
    readFile(path.join(process.cwd(), "public", "cards", "logo.png")),
    ...MEDALLAS.map((file) =>
      readFile(path.join(process.cwd(), "public", "cards", file))
    ),
  ]).then(async ([backgroundBytes, logoBytes, ...medalBytes]) => [
    await pdf.embedPng(backgroundBytes),
    await pdf.embedPng(logoBytes),
    ...(await Promise.all(medalBytes.map((bytes) => pdf.embedPng(bytes)))),
  ]);
  const illustrationUrls = [
    ...new Set(
      cards
        .map((card) => getDTAvatarUrl(card.alias))
        .filter((url): url is string => url !== null)
    ),
  ];
  const customIllustrations = new Map(
    await Promise.all(
      illustrationUrls.map(async (url) => {
        const assetPath = path.join(
          process.cwd(),
          "public",
          ...url.slice(1).split("/")
        );
        const image = await pdf.embedPng(await readFile(assetPath));
        return [url, image] as const;
      })
    )
  );
  const photoImages = await Promise.all(
    cards.map((card) => {
      const illustrationUrl = getDTAvatarUrl(card.alias);
      const illustration = illustrationUrl
        ? customIllustrations.get(illustrationUrl)
        : undefined;
      return illustration
        ? Promise.resolve(illustration)
        : embedProfilePhoto(pdf, supabase, card.photoUrl);
    })
  );
  const dateText = formatDate(match.kickoff_at);

  for (const [index, card] of cards.entries()) {
    const page = pdf.addPage([PDF_WIDTH, PDF_HEIGHT]);
    page.drawImage(background, {
      x: 0,
      y: 0,
      width: PDF_WIDTH,
      height: PDF_HEIGHT,
    });

    drawImageTop(page, logo, 347, 88, 258, 104);
    drawImageTop(
      page,
      medallas[index],
      CARD_WIDTH - 75 - 238,
      154,
      238,
      238
    );

    const portrait = photoImages[index];
    if (portrait) {
      const portraitBox = { x: 68, top: 55, width: 388, height: 528 };
      const aspect = portrait.width / portrait.height;
      let width = portraitBox.width;
      let height = width / aspect;
      if (height > portraitBox.height) {
        height = portraitBox.height;
        width = height * aspect;
      }
      drawImageTop(
        page,
        portrait,
        portraitBox.x,
        portraitBox.top,
        width,
        height
      );
    } else {
      const avatarSize = 122;
      page.drawCircle({
        x: (68 + avatarSize / 2) * PDF_SCALE,
        y: PDF_HEIGHT - (110 + avatarSize / 2) * PDF_SCALE,
        size: (avatarSize / 2) * PDF_SCALE,
        color: rgb(0.04, 0.16, 0.1),
        borderColor: rgb(0.95, 0.71, 0.2),
        borderWidth: 2 * PDF_SCALE,
      });
      drawFittedText(page, card.alias.trim().charAt(0).toUpperCase() || "?", {
        x: 68,
        top: 148,
        width: avatarSize,
        size: 78,
        font: bold,
        color: rgb(0.95, 0.71, 0.2),
        align: "center",
      });
    }

    drawFittedText(page, card.nombre || "DT", {
      x: 286,
      top: 407,
      width: 320,
      size: 44,
      font: bold,
      color: rgb(1, 1, 1),
      align: "right",
    });
    drawFittedText(page, card.alias.toUpperCase(), {
      x: 286,
      top: 454,
      width: 320,
      size: 92,
      font: bold,
      color: rgb(1, 1, 1),
      align: "right",
    });

    const equipo = [
      ...card.titulares,
      ...(card.suplente ? [card.suplente] : []),
    ]
      .sort((a, b) => {
        const aPoints = a.isSuplente ? a.points / 2 : a.points;
        const bPoints = b.isSuplente ? b.points / 2 : b.points;
        return bPoints - aPoints;
      })
      .slice(0, 6);
    const rowTop = 550;
    const rowHeight = 48;
    const rowGap = 9;
    equipo.forEach((player, playerIndex) => {
      const top = rowTop + playerIndex * (rowHeight + rowGap);
      page.drawRectangle({
        x: 75 * PDF_SCALE,
        y: PDF_HEIGHT - (top + rowHeight) * PDF_SCALE,
        width: 530 * PDF_SCALE,
        height: rowHeight * PDF_SCALE,
        color: rgb(0.027, 0.098, 0.059),
        opacity: 0.38,
      });
      drawFittedText(page, String(playerIndex + 1), {
        x: 86,
        top: top + 8,
        width: 48,
        size: 46,
        font: bold,
        color: rgb(1, 1, 1),
        align: "right",
      });
      drawFittedText(page, player.isSuplente ? "S ½" : "T", {
        x: 138,
        top: top + 8,
        width: 70,
        size: 46,
        font: bold,
        color: rgb(1, 1, 1),
      });
      drawFittedText(page, player.alias, {
        x: 208,
        top: top + 8,
        width: 296,
        size: 38,
        font: regular,
        color: rgb(1, 1, 1),
      });
      drawFittedText(
        page,
        formatearPuntos(
          player.isSuplente ? player.points / 2 : player.points
        ),
        {
          x: 510,
          top: top + 7,
          width: 82,
          size: 42,
          font: bold,
          color: rgb(0.95, 0.71, 0.2),
          align: "right",
        }
      );
    });

    page.drawRectangle({
      x: 75 * PDF_SCALE,
      y: 62 * PDF_SCALE,
      width: 530 * PDF_SCALE,
      height: 116 * PDF_SCALE,
      color: rgb(0.027, 0.098, 0.059),
      opacity: 0.38,
    });
    drawFittedText(page, `FECHA ${match.number}`, {
      x: 90,
      top: 936,
      width: 250,
      size: 48,
      font: bold,
      color: rgb(0.95, 0.71, 0.2),
    });
    drawFittedText(page, dateText, {
      x: 90,
      top: 986,
      width: 280,
      size: 40,
      font: regular,
      color: rgb(0.95, 0.71, 0.2),
    });
    drawFittedText(page, "pts", {
      x: 405,
      top: 1000,
      width: 85,
      size: 40,
      font: bold,
      color: rgb(0.95, 0.71, 0.2),
    });
    drawFittedText(page, formatearPuntos(card.points), {
      x: 480,
      top: 936,
      width: 120,
      size: 96,
      font: bold,
      color: rgb(0.95, 0.71, 0.2),
      align: "right",
    });
  }

  const objectPath = `${match.group_id}/${match.season_id}/${match.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, await pdf.save(), {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  return { path: objectPath, cartas: cards.length };
}

async function embedProfilePhoto(
  pdf: PDFDocument,
  supabase: SupabaseClient,
  photoUrl: string | null
) {
  if (!photoUrl || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  let photo: URL;
  let supabaseUrl: URL;
  try {
    photo = new URL(photoUrl);
    supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  } catch (error) {
    console.error("Invalid DT profile photo URL:", error);
    return null;
  }
  const prefix = "/storage/v1/object/public/avatars/";
  if (photo.origin !== supabaseUrl.origin || !photo.pathname.startsWith(prefix)) {
    return null;
  }

  let objectPath: string;
  try {
    objectPath = decodeURIComponent(photo.pathname.slice(prefix.length));
  } catch (error) {
    console.error("Invalid encoded DT profile photo path:", error);
    return null;
  }
  if (!objectPath) return null;
  const { data, error } = await supabase.storage
    .from("avatars")
    .download(objectPath);
  if (error) {
    console.error("Could not load a DT profile photo for the PDF:", error);
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (data.type === "image/png") return pdf.embedPng(bytes);
  if (data.type === "image/jpeg") return pdf.embedJpg(bytes);
  return null;
}

function drawImageTop(
  page: ReturnType<PDFDocument["addPage"]>,
  image: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  x: number,
  top: number,
  width: number,
  height: number
) {
  page.drawImage(image, {
    x: x * PDF_SCALE,
    y: PDF_HEIGHT - (top + height) * PDF_SCALE,
    width: width * PDF_SCALE,
    height: height * PDF_SCALE,
  });
}

function drawFittedText(
  page: ReturnType<PDFDocument["addPage"]>,
  value: string,
  options: {
    x: number;
    top: number;
    width: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    align?: "left" | "right" | "center";
  }
) {
  const text = value.replace(/[^\x00-\xFF]/g, "?");
  let size = options.size * PDF_SCALE;
  const maxWidth = options.width * PDF_SCALE;
  while (size > 8 && options.font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  const textWidth = options.font.widthOfTextAtSize(text, size);
  const offset =
    options.align === "right"
      ? options.width - textWidth / PDF_SCALE
      : options.align === "center"
        ? (options.width - textWidth / PDF_SCALE) / 2
        : 0;
  const x = (options.x + offset) * PDF_SCALE;
  page.drawText(text, {
    x,
    y: PDF_HEIGHT - options.top * PDF_SCALE - size,
    size,
    font: options.font,
    color: options.color,
  });
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const localDate = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${String(localDate.getUTCDate()).padStart(2, "0")}/${String(
    localDate.getUTCMonth() + 1
  ).padStart(2, "0")}/${localDate.getUTCFullYear()}`;
}
