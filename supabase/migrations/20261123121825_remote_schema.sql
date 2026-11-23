SET local check_function_bodies = off;

CREATE ROLE "lakat_api" WITH NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;

ALTER ROLE "lakat_api" SET "search_path" TO '$user', 'public', 'extensions';

CREATE EXTENSION "postgis" SCHEMA "extensions";

CREATE TABLE "public"."accommodations" (
  "id"            uuid                             NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    timestamp with time zone         NOT NULL DEFAULT now(),
  "name"          text                             NOT NULL,
  "address"       text                             NOT NULL,
  "phone"         text,
  "email"         text,
  "photo_url"     text,
  "description"   text,
  "type"          text                             NOT NULL DEFAULT 'hotel'::text,
  "latitude"      numeric,
  "longitude"     numeric,
  "location_type" text                             NOT NULL DEFAULT 'iloilo_city'::text,
  "updated_at"    timestamp with time zone         DEFAULT now(),
  "location"      extensions.geography(Point,4326),
  "trashed_at"    timestamp with time zone,
  "trashed_by"    uuid,
  CONSTRAINT "accommodations_inside_iloilo" CHECK (((latitude IS NOT NULL) AND (longitude IS
    NOT NULL) AND ((latitude >= 10.4) AND (latitude <= 11.7)) AND ((longitude >= 121.8) AND (longitude <= 123.3)))),
  CONSTRAINT "accommodations_photo_url_https" CHECK (((photo_url IS NULL) OR ((photo_url ~~ 'https://%'::text) AND (char_length(photo_url) <= 500)))),
  CONSTRAINT "accommodations_pkey" PRIMARY KEY (id),
  CONSTRAINT "accommodations_text_lengths"
    CHECK
    ((((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100)) AND ((char_length(btrim(address)) >= 1) AND (char_length(btrim(address)) <= 200)) AND ((description IS
    NULL) OR ((char_length(btrim(description)) >= 1) AND (char_length(btrim(description)) <= 1000))) AND ((phone IS NULL) OR (char_length(phone) <= 40)) AND
    ((email IS NULL) OR (char_length(email) <= 120)))),
  CONSTRAINT "valid_accommodation_location_type" CHECK ((location_type = ANY (ARRAY['iloilo_city'::text, 'iloilo_province'::text])))
);

ALTER TABLE "public"."accommodations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admins" (
  "user_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "admins_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."admins"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."admins" FROM "anon";

CREATE TABLE "public"."destinations" (
  "id"            uuid                             NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    timestamp with time zone         NOT NULL DEFAULT now(),
  "name"          text                             NOT NULL,
  "address"       text                             NOT NULL,
  "latitude"      numeric,
  "longitude"     numeric,
  "photo_url"     text,
  "description"   text,
  "category"      text                             NOT NULL DEFAULT 'mountain'::text,
  "location_type" text                             NOT NULL DEFAULT 'iloilo_province'::text,
  "updated_at"    timestamp with time zone         DEFAULT now(),
  "location"      extensions.geography(Point,4326),
  "trashed_at"    timestamp with time zone,
  "trashed_by"    uuid,
  CONSTRAINT "destinations_inside_iloilo" CHECK (((latitude IS NOT NULL) AND (longitude IS
    NOT NULL) AND ((latitude >= 10.4) AND (latitude <= 11.7)) AND ((longitude >= 121.8) AND (longitude <= 123.3)))),
  CONSTRAINT "destinations_photo_url_https" CHECK (((photo_url IS NULL) OR ((photo_url ~~ 'https://%'::text) AND (char_length(photo_url) <= 500)))),
  CONSTRAINT "destinations_pkey" PRIMARY KEY (id),
  CONSTRAINT "destinations_text_lengths"
    CHECK
    ((((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100)) AND ((char_length(btrim(address)) >= 1) AND (char_length(btrim(address)) <= 200)) AND ((description IS
    NULL) OR ((char_length(btrim(description)) >= 1) AND (char_length(btrim(description)) <= 1000))))),
  CONSTRAINT "valid_location" CHECK ((location_type = ANY (ARRAY['iloilo_city'::text, 'iloilo_province'::text])))
);

ALTER TABLE "public"."destinations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "kind"       text                     NOT NULL,
  "review_id"  uuid                     NOT NULL,
  "reply_id"   uuid,
  "actor_name" text                     NOT NULL,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "actor_id"   uuid,
  CONSTRAINT "notifications_kind_check" CHECK ((kind = ANY (ARRAY['review_reply'::text, 'reply_answer'::text, 'review_like'::text, 'reply_like'::text]))),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."notifications" FROM "anon";

CREATE TABLE "public"."place_categories" (
  "id"             text                     NOT NULL,
  "name"           text                     NOT NULL,
  "applies_to"     text                     NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "icon"           text,
  "photo_place_id" uuid,
  CONSTRAINT "place_categories_applies_to_check" CHECK ((applies_to = ANY (ARRAY['destination'::text, 'accommodation'::text]))),
  CONSTRAINT "place_categories_icon_check"
    CHECK
    (((icon IS NULL) OR (icon = ANY (ARRAY['mountain'::text, 'utensils'::text, 'footprints'::text, 'party'::text, 'trees'::text, 'landmark'::text, 'hotel'::text, 'building'::text,
    'waves'::text, 'tent'::text, 'coffee'::text, 'church'::text, 'camera'::text, 'ship'::text, 'palm'::text, 'pin'::text])))),
  CONSTRAINT "place_categories_id_check" CHECK (((id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::text) AND (char_length(id) <= 40))),
  CONSTRAINT "place_categories_name_check" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 30))),
  CONSTRAINT "place_categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."place_categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."place_photo_credits" (
  "place_type"           text                     NOT NULL,
  "place_id"             uuid                     NOT NULL,
  "photographer"         text                     NOT NULL,
  "publisher"            text                     NOT NULL DEFAULT ''::text,
  "source_url"           text                     NOT NULL DEFAULT ''::text,
  "licence"              text                     NOT NULL,
  "authorization_status" text                     NOT NULL,
  "credit_line"          text                     NOT NULL,
  "for_photo_url"        text,
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by"           uuid,
  "photo_id"             uuid                     NOT NULL,
  CONSTRAINT "all_rights_reserved_needs_permission" CHECK (((licence <> 'all_rights_reserved'::text) OR (authorization_status = 'owner_permission'::text))),
  CONSTRAINT "place_photo_credits_authorization_status_check"
    CHECK ((authorization_status = ANY (ARRAY['licence_allows'::text, 'owner_permission'::text, 'own_photo'::text, 'not_checked'::text]))),
  CONSTRAINT "place_photo_credits_credit_line_check" CHECK (((char_length(btrim(credit_line)) >= 1) AND (char_length(btrim(credit_line)) <= 200))),
  CONSTRAINT "place_photo_credits_licence_check"
    CHECK ((licence = ANY (ARRAY['cc_by_4'::text, 'cc_by_sa_4'::text, 'cc0'::text, 'all_rights_reserved'::text, 'own_photo'::text, 'other'::text]))),
  CONSTRAINT "place_photo_credits_photographer_check" CHECK (((char_length(btrim(photographer)) >= 1) AND (char_length(btrim(photographer)) <= 100))),
  CONSTRAINT "place_photo_credits_pkey" PRIMARY KEY (photo_id),
  CONSTRAINT "place_photo_credits_place_type_check" CHECK ((place_type = ANY (ARRAY['destination'::text, 'accommodation'::text]))),
  CONSTRAINT "place_photo_credits_publisher_check" CHECK ((char_length(publisher) <= 100)),
  CONSTRAINT "place_photo_credits_source_url_check" CHECK (((source_url = ''::text) OR ((source_url ~ '^https://[^\s]+$'::text) AND (char_length(source_url) <= 500))))
);

ALTER TABLE "public"."place_photo_credits"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."place_photo_credits" FROM "anon";

CREATE TABLE "public"."place_photos" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "place_type" text                     NOT NULL,
  "place_id"   uuid                     NOT NULL,
  "photo_url"  text                     NOT NULL,
  "position"   smallint                 NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "place_photos_one_per_position" UNIQUE (place_type, place_id, "position") DEFERRABLE,
  CONSTRAINT "place_photos_photo_url_check" CHECK (((char_length(photo_url) >= 1) AND (char_length(photo_url) <= 1000))),
  CONSTRAINT "place_photos_pkey" PRIMARY KEY (id),
  CONSTRAINT "place_photos_place_type_check" CHECK ((place_type = ANY (ARRAY['destination'::text, 'accommodation'::text]))),
  CONSTRAINT "place_photos_position_check" CHECK ((("position" >= 1) AND ("position" <= 6)))
);

ALTER TABLE "public"."place_photos"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."place_photos" FROM "anon";

CREATE TABLE "public"."reply_hidden_texts" (
  "reply_id"  uuid                     NOT NULL,
  "comment"   text                     NOT NULL,
  "hidden_by" uuid,
  "hidden_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reply_hidden_texts_pkey" PRIMARY KEY (reply_id)
);

ALTER TABLE "public"."reply_hidden_texts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."reply_hidden_texts" FROM "anon";

CREATE TABLE "public"."reply_likes" (
  "reply_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "reply_likes_pkey" PRIMARY KEY (reply_id, user_id)
);

ALTER TABLE "public"."reply_likes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."report_signals" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "report_signals_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."report_signals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."review_likes" (
  "review_id"  uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "review_likes_pkey" PRIMARY KEY (review_id, user_id)
);

ALTER TABLE "public"."review_likes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."review_photos" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "review_id"  uuid                     NOT NULL,
  "photo_path" text                     NOT NULL,
  "position"   smallint                 NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "review_photos_photo_path_key" UNIQUE (photo_path),
  CONSTRAINT "review_photos_pkey" PRIMARY KEY (id),
  CONSTRAINT "review_photos_position_check" CHECK ((("position" >= 1) AND ("position" <= 4))),
  CONSTRAINT "review_photos_review_id_position_key" UNIQUE (review_id, "position")
);

ALTER TABLE "public"."review_photos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."review_replies" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "review_id"       uuid                     NOT NULL,
  "replier_name"    text                     NOT NULL DEFAULT ''::text,
  "traveler_type"   text,
  "comment"         text                     NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "parent_reply_id" uuid,
  "updated_at"      timestamp with time zone,
  "deleted_at"      timestamp with time zone,
  "hidden_at"       timestamp with time zone,
  "trashed_at"      timestamp with time zone,
  "trashed_by"      uuid,
  CONSTRAINT "review_replies_comment_check" CHECK (((deleted_at IS NOT NULL) OR (hidden_at IS NOT NULL) OR (trashed_at IS
    NOT NULL) OR ((char_length(btrim(comment)) >= 1) AND (char_length(btrim(comment)) <= 300)))),
  CONSTRAINT "review_replies_pkey" PRIMARY KEY (id),
  CONSTRAINT "review_replies_traveler_type_check" CHECK ((traveler_type = ANY (ARRAY['local'::text, 'domestic'::text, 'foreign'::text]))),
  "user_id"         uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."review_replies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."review_reports" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "review_id"  uuid                     NOT NULL,
  "reason"     text                     NOT NULL,
  "note"       text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "review_reports_note_check" CHECK (((note IS NULL) OR (char_length(note) <= 300))),
  CONSTRAINT "review_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "review_reports_reason_check" CHECK ((reason = ANY (ARRAY['spam'::text, 'offensive'::text, 'not_about_place'::text, 'other'::text]))),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "review_reports_review_id_user_id_key" UNIQUE (review_id, user_id)
);

ALTER TABLE "public"."review_reports"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."review_reports" FROM "anon";

CREATE TABLE "public"."review_visibility_signals" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "place_type" text                     NOT NULL,
  "place_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "review_visibility_signals_pkey" PRIMARY KEY (id),
  CONSTRAINT "review_visibility_signals_place_type_check" CHECK ((place_type = ANY (ARRAY['destination'::text, 'accommodation'::text])))
);

ALTER TABLE "public"."review_visibility_signals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "place_type"         text                     NOT NULL,
  "place_id"           uuid                     NOT NULL,
  "reviewer_name"      text                     NOT NULL DEFAULT ''::text,
  "rating"             smallint                 NOT NULL,
  "comment"            text                     NOT NULL,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "traveler_type"      text,
  "hidden_at"          timestamp with time zone,
  "trashed_at"         timestamp with time zone,
  "trashed_by"         uuid,
  "trashed_with_place" boolean                  NOT NULL DEFAULT false,
  "video_path"         text,
  CONSTRAINT "reviews_comment_check" CHECK (((char_length(btrim(comment)) >= 1) AND (char_length(btrim(comment)) <= 500))),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_place_type_check" CHECK ((place_type = ANY (ARRAY['destination'::text, 'accommodation'::text]))),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT "reviews_traveler_type_check" CHECK ((traveler_type = ANY (ARRAY['local'::text, 'domestic'::text, 'foreign'::text]))),
  "user_id"            uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."trashed_reply_texts" (
  "reply_id"      uuid NOT NULL,
  "comment"       text NOT NULL,
  "replier_name"  text NOT NULL,
  "traveler_type" text,
  "user_id"       uuid,
  CONSTRAINT "trashed_reply_texts_pkey" PRIMARY KEY (reply_id)
);

ALTER TABLE "public"."trashed_reply_texts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."trashed_reply_texts" FROM "anon";

CREATE OR REPLACE FUNCTION public.admin_delete_place_for_good (
  kind   text,
  target uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  files jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete places.' using errcode = '42501';
  end if;
  if not (
    (kind = 'destination' and exists (select 1 from public.destinations where id = target and trashed_at is not null))
    or (kind = 'accommodation' and exists (select 1 from public.accommodations where id = target and trashed_at is not null))
  ) then
    return null;
  end if;
  files := public.files_of_place(kind, target);
  if kind = 'destination' then
    delete from public.destinations where id = target;
  else
    delete from public.accommodations where id = target;
  end if;
  return files;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_delete_place_for_good"(text, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_delete_reply_for_good (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete other travelers'' replies.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.review_replies where id = target and trashed_at is not null) then
    return null;
  end if;
  perform public.delete_trashed_reply(target);
  return 'deleted';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_delete_reply_for_good"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_delete_review_for_good (
  target uuid
)
  RETURNS text[]
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  files text[];
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete reviews.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.reviews
                  where id = target and trashed_at is not null and not trashed_with_place) then
    return null;
  end if;
  select coalesce(array_agg(photo_path), '{}') into files
    from public.review_photos where review_id = target;
  delete from public.reviews where id = target;
  return files;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_delete_review_for_good"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_empty_expired_trash()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  cutoff timestamptz := now() - interval '30 days';
  photo_urls jsonb := '[]'::jsonb;
  review_paths jsonb := '[]'::jsonb;
  files jsonb;
  item record;
  places int := 0;
  reviews int := 0;
  replies int := 0;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;

  for item in
    select 'destination'::text as kind, id from public.destinations where trashed_at < cutoff
    union all
    select 'accommodation', id from public.accommodations where trashed_at < cutoff
  loop
    files := public.files_of_place(item.kind, item.id);
    photo_urls := photo_urls || (files -> 'photo_urls');
    review_paths := review_paths || (files -> 'review_photo_paths');
    if item.kind = 'destination' then
      delete from public.destinations where id = item.id;
    else
      delete from public.accommodations where id = item.id;
    end if;
    places := places + 1;
  end loop;

  review_paths := review_paths || coalesce((
    select jsonb_agg(p.photo_path) from public.review_photos p
      join public.reviews r on r.id = p.review_id
     where r.trashed_at < cutoff and not r.trashed_with_place), '[]'::jsonb);
  with gone as (
    delete from public.reviews where trashed_at < cutoff and not trashed_with_place returning 1
  ) select count(*) into reviews from gone;

  -- Newest first, so an answer goes before the reply it answers.
  for item in
    select id from public.review_replies where trashed_at < cutoff order by created_at desc
  loop
    perform public.delete_trashed_reply(item.id);
    replies := replies + 1;
  end loop;

  return jsonb_build_object(
    'photo_urls', photo_urls,
    'review_photo_paths', review_paths,
    'places', places,
    'reviews', reviews,
    'replies', replies
  );
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_empty_expired_trash"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_hide_reply (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  found_reply record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may hide replies.' using errcode = '42501';
  end if;
  select id, comment, hidden_at, deleted_at into found_reply
    from public.review_replies where id = target for update;
  if found_reply.id is null or found_reply.deleted_at is not null then
    return null;
  end if;
  if found_reply.hidden_at is not null then
    return 'hidden';
  end if;
  insert into public.reply_hidden_texts (reply_id, comment, hidden_by)
  values (target, found_reply.comment, auth.uid());
  update public.review_replies set comment = '', hidden_at = now() where id = target;
  return 'hidden';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_hide_reply"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_likers (
  kind   text,
  target uuid
)
  RETURNS TABLE (
    user_id      uuid,
    display_name text,
    created_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may see who marked something Helpful.'
      using errcode = '42501';
  end if;
  if kind not in ('review', 'reply') then
    raise exception 'kind must be review or reply' using errcode = '22023';
  end if;

  return query
    select l.user_id,
           coalesce(nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''), 'Traveler'),
           l.created_at
      from (
            select rl.user_id, rl.created_at from public.review_likes rl
             where kind = 'review' and rl.review_id = target
            union all
            select pl.user_id, pl.created_at from public.reply_likes pl
             where kind = 'reply' and pl.reply_id = target
           ) l
      left join auth.users u on u.id = l.user_id
     order by l.created_at desc;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_likers"(text, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_restore_place (
  kind   text,
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  moved uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore places.' using errcode = '42501';
  end if;
  if kind = 'destination' then
    update public.destinations set trashed_at = null, trashed_by = null
     where id = target and trashed_at is not null returning id into moved;
  elsif kind = 'accommodation' then
    update public.accommodations set trashed_at = null, trashed_by = null
     where id = target and trashed_at is not null returning id into moved;
  end if;
  if moved is null then
    return null;
  end if;
  update public.reviews
     set trashed_at = null, trashed_by = null, trashed_with_place = false
   where place_type = kind and place_id = target and trashed_with_place;
  insert into public.review_visibility_signals (place_type, place_id) values (kind, target);
  return 'restored';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_restore_place"(text, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_restore_reply (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  reply public.review_replies%rowtype;
  kept public.trashed_reply_texts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore replies.' using errcode = '42501';
  end if;
  select * into reply from public.review_replies
   where id = target and trashed_at is not null
     for update;
  if not found then
    return null;
  end if;
  if exists (select 1 from public.reviews where id = reply.review_id and trashed_at is not null) then
    raise exception 'Its review is in the Trash. Restore the review first, then this reply.'
      using errcode = '55000';
  end if;
  select * into kept from public.trashed_reply_texts where reply_id = target;
  update public.review_replies
     set comment = coalesce(kept.comment, ''),
         replier_name = coalesce(kept.replier_name, ''),
         traveler_type = kept.traveler_type,
         user_id = kept.user_id,
         trashed_at = null, trashed_by = null
   where id = target;
  delete from public.trashed_reply_texts where reply_id = target;
  return 'restored';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_restore_reply"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_restore_review (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  found_review record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore reviews.' using errcode = '42501';
  end if;
  select id, user_id, place_type, place_id into found_review
    from public.reviews where id = target and trashed_at is not null and not trashed_with_place for update;
  if found_review.id is null then
    return null;
  end if;
  if exists (select 1 from public.destinations where found_review.place_type = 'destination'
                and id = found_review.place_id and trashed_at is not null)
     or exists (select 1 from public.accommodations where found_review.place_type = 'accommodation'
                and id = found_review.place_id and trashed_at is not null) then
    raise exception 'Its place is in the Trash. Restore the place first, then this review.'
      using errcode = '55000';
  end if;
  if exists (select 1 from public.reviews
              where user_id = found_review.user_id and place_type = found_review.place_type
                and place_id = found_review.place_id and trashed_at is null) then
    raise exception 'Its writer has written a new review of this place since. Delete that one first, or keep this one in the Trash.'
      using errcode = '23505';
  end if;
  update public.reviews set trashed_at = null, trashed_by = null where id = target;
  insert into public.review_visibility_signals (place_type, place_id)
  values (found_review.place_type, found_review.place_id);
  return 'restored';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_restore_review"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_show_reply (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  found_reply record;
  saved_text text;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may show replies.' using errcode = '42501';
  end if;
  select id, hidden_at, deleted_at into found_reply
    from public.review_replies where id = target for update;
  if found_reply.id is null or found_reply.deleted_at is not null then
    return null;
  end if;
  if found_reply.hidden_at is null then
    return 'shown';
  end if;
  delete from public.reply_hidden_texts where reply_id = target returning comment into saved_text;
  update public.review_replies
     set comment = coalesce(saved_text, ''), hidden_at = null
   where id = target;
  return 'shown';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_show_reply"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_storage_used()
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not (select public.is_admin ()) then
    raise exception 'This is for the Lakat Iloilo team.'
      using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'place_photos',  coalesce(sum(size) filter (where bucket_id = 'place-photos'), 0),
      'review_photos', coalesce(sum(size) filter (where bucket_id = 'review-photos'), 0),
      'review_videos', coalesce(sum(size) filter (where bucket_id = 'review-videos'), 0),
      'total',         coalesce(sum(size), 0)
    )
    from (
      -- Storage keeps each file's size, in bytes, in its metadata.
      select o.bucket_id, coalesce((o.metadata ->> 'size')::bigint, 0) as size
        from storage.objects o
    ) files
  );
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_storage_used"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trash_place (
  kind   text,
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  moved uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete places.' using errcode = '42501';
  end if;
  if kind = 'destination' then
    update public.destinations set trashed_at = now(), trashed_by = auth.uid()
     where id = target and trashed_at is null returning id into moved;
  elsif kind = 'accommodation' then
    update public.accommodations set trashed_at = now(), trashed_by = auth.uid()
     where id = target and trashed_at is null returning id into moved;
  end if;
  if moved is null then
    return null;
  end if;
  update public.reviews
     set trashed_at = now(), trashed_by = auth.uid(), trashed_with_place = true
   where place_type = kind and place_id = target and trashed_at is null;
  insert into public.review_visibility_signals (place_type, place_id) values (kind, target);
  return 'trashed';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trash_place"(text, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trash_reply (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  reply public.review_replies%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete other travelers'' replies.' using errcode = '42501';
  end if;
  select * into reply from public.review_replies
   where id = target and deleted_at is null and trashed_at is null
     for update;
  if not found then
    return null;
  end if;
  insert into public.trashed_reply_texts (reply_id, comment, replier_name, traveler_type, user_id)
  values (reply.id, reply.comment, reply.replier_name, reply.traveler_type, reply.user_id);
  update public.review_replies
     set comment = '', replier_name = '', traveler_type = null, user_id = null,
         trashed_at = now(), trashed_by = auth.uid()
   where id = target;
  delete from public.notifications where reply_id = target;
  return 'trashed';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trash_reply"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trash_review (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  moved record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete reviews.' using errcode = '42501';
  end if;
  update public.reviews
     set trashed_at = now(), trashed_by = auth.uid()
   where id = target and trashed_at is null
  returning place_type, place_id into moved;
  if moved.place_type is null then
    return null;
  end if;
  insert into public.review_visibility_signals (place_type, place_id)
  values (moved.place_type, moved.place_id);
  return 'trashed';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trash_review"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trashed_places()
  RETURNS TABLE (
    id              uuid,
    place_type      text,
    name            text,
    photo_url       text,
    review_count    integer,
    photo_count     integer,
    trashed_at      timestamp with time zone,
    trashed_by_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;
  return query
    select x.id, x.place_type, x.name, x.photo_url,
           (select count(*)::int from public.reviews r
             where r.place_type = x.place_type and r.place_id = x.id and r.trashed_with_place),
           (select count(*)::int from public.place_photos pp
             where pp.place_type = x.place_type and pp.place_id = x.id),
           x.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from (
        select d.id, 'destination'::text as place_type, d.name, d.photo_url, d.trashed_at, d.trashed_by
          from public.destinations d where d.trashed_at is not null
        union all
        select a.id, 'accommodation'::text, a.name, a.photo_url, a.trashed_at, a.trashed_by
          from public.accommodations a where a.trashed_at is not null
      ) x
      left join auth.users u on u.id = x.trashed_by
     order by x.trashed_at desc;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trashed_places"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trashed_replies()
  RETURNS TABLE (
    id              uuid,
    review_id       uuid,
    place_type      text,
    place_id        uuid,
    place_name      text,
    reviewer_name   text,
    replier_name    text,
    comment         text,
    answer_count    integer,
    like_count      integer,
    review_in_trash boolean,
    trashed_at      timestamp with time zone,
    trashed_by_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;
  return query
    select p.id, p.review_id, r.place_type, r.place_id,
           coalesce(d.name, a.name, 'A place that was deleted'),
           r.reviewer_name,
           coalesce(nullif(t.replier_name, ''), 'A traveler'),
           coalesce(nullif(h.comment, ''), t.comment, ''),
           (select count(*)::int from public.review_replies c where c.parent_reply_id = p.id),
           (select count(*)::int from public.reply_likes l where l.reply_id = p.id),
           r.trashed_at is not null,
           p.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from public.review_replies p
      join public.reviews r on r.id = p.review_id
      left join public.trashed_reply_texts t on t.reply_id = p.id
      left join public.reply_hidden_texts h on h.reply_id = p.id
      left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
      left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
      left join auth.users u on u.id = p.trashed_by
     where p.trashed_at is not null
     order by p.trashed_at desc;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trashed_replies"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trashed_review_videos()
  RETURNS TABLE (
    review_id  uuid,
    video_path text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not (select public.is_admin ()) then
    raise exception 'This is for the Lakat Iloilo team.'
      using errcode = '42501';
  end if;
  -- A review is in the Trash when it has trashed_at (060), also when it
  -- went with its place (061).
  return query
    select r.id, r.video_path
      from public.reviews r
     where r.trashed_at is not null
       and r.video_path is not null;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trashed_review_videos"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_trashed_reviews()
  RETURNS TABLE (
    id              uuid,
    place_type      text,
    place_id        uuid,
    place_name      text,
    reviewer_name   text,
    rating          smallint,
    comment         text,
    reply_count     integer,
    photo_count     integer,
    report_count    integer,
    place_in_trash  boolean,
    trashed_at      timestamp with time zone,
    trashed_by_name text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;
  return query
    select r.id, r.place_type, r.place_id,
           coalesce(d.name, a.name, 'A place that was deleted'),
           r.reviewer_name, r.rating::smallint, r.comment,
           (select count(*)::int from public.review_replies p where p.review_id = r.id),
           (select count(*)::int from public.review_photos ph where ph.review_id = r.id),
           (select count(*)::int from public.review_reports rr where rr.review_id = r.id),
           coalesce(d.trashed_at, a.trashed_at) is not null,
           r.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from public.reviews r
      left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
      left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
      left join auth.users u on u.id = r.trashed_by
     where r.trashed_at is not null and not r.trashed_with_place
     order by r.trashed_at desc;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_trashed_reviews"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.copy_profile_to_reviews_and_replies()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  new_name text := public.public_name_of(new.raw_user_meta_data);
  new_type text := case
    when new.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
      then new.raw_user_meta_data ->> 'traveler_type'
  end;
begin
  -- The reviews trigger fills in the name and type from the account
  -- again and keeps updated_at as it was.
  update public.reviews
     set reviewer_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and (reviewer_name is distinct from new_name
          or traveler_type is distinct from new_type);

  update public.review_replies
     set replier_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and deleted_at is null
     and (replier_name is distinct from new_name
          or traveler_type is distinct from new_type);

  -- 037: the notifications this traveler caused.
  update public.notifications
     set actor_name = new_name
   where actor_id = new.id
     and actor_name is distinct from new_name;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_credits_of_place()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  delete from public.place_photo_credits
   where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_credits_of_place"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.delete_own_reply (
  target uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  reply public.review_replies%rowtype;
  parent public.review_replies%rowtype;
  next_parent uuid;
begin
  select * into reply
    from public.review_replies
   where id = target
     and user_id = auth.uid()
     and deleted_at is null
     for update;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.review_replies where parent_reply_id = target) then
    update public.review_replies
       set comment = '',
           replier_name = '',
           traveler_type = null,
           user_id = null,  -- 037
           deleted_at = now()
     where id = target;
    delete from public.reply_likes where reply_id = target;
    delete from public.notifications where reply_id = target;
    return 'kept';
  end if;

  delete from public.review_replies where id = target;

  -- Climb the thread: a deleted reply left with no answers goes too.
  next_parent := reply.parent_reply_id;
  while next_parent is not null loop
    select * into parent from public.review_replies where id = next_parent for update;
    exit when not found
           or parent.deleted_at is null
           or exists (select 1 from public.review_replies where parent_reply_id = parent.id);
    delete from public.review_replies where id = parent.id;
    next_parent := parent.parent_reply_id;
  end loop;

  return 'removed';
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_own_reply"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.delete_photos_of_place()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  delete from public.place_photos where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_photos_of_place"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.delete_reviews_of_place()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  delete from public.reviews
   where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_reviews_of_place"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.delete_trashed_reply (
  target uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  reply public.review_replies%rowtype;
  parent public.review_replies%rowtype;
  next_parent uuid;
begin
  select * into reply from public.review_replies where id = target and trashed_at is not null for update;
  if not found then
    return;
  end if;
  delete from public.trashed_reply_texts where reply_id = target;

  if exists (select 1 from public.review_replies where parent_reply_id = target) then
    -- Stays as "This reply was deleted" (its text, name, tag and writer
    -- are empty already). Setting deleted_at forgets a hidden text (056).
    update public.review_replies
       set deleted_at = now(), trashed_at = null, trashed_by = null
     where id = target;
    delete from public.reply_likes where reply_id = target;
    return;
  end if;

  delete from public.review_replies where id = target;

  -- Climb the thread: a deleted reply left with no answers goes too (not
  -- one in the Trash: it waits there).
  next_parent := reply.parent_reply_id;
  while next_parent is not null loop
    select * into parent from public.review_replies where id = next_parent for update;
    exit when not found
           or parent.deleted_at is null
           or exists (select 1 from public.review_replies where parent_reply_id = parent.id);
    delete from public.review_replies where id = parent.id;
    next_parent := parent.parent_reply_id;
  end loop;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_trashed_reply"(uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.files_of_place (
  kind   text,
  target uuid
)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select jsonb_build_object(
    'photo_urls', coalesce((
      select jsonb_agg(distinct u) from (
        select photo_url as u from public.destinations where kind = 'destination' and id = target and photo_url is not null
        union all
        select photo_url from public.accommodations where kind = 'accommodation' and id = target and photo_url is not null
        union all
        select photo_url from public.place_photos where place_type = kind and place_id = target
      ) urls), '[]'::jsonb),
    'review_photo_paths', coalesce((
      select jsonb_agg(p.photo_path) from public.review_photos p
        join public.reviews r on r.id = p.review_id
       where r.place_type = kind and r.place_id = target), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION "public"."files_of_place"(text, uuid) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.forget_hidden_text_of_deleted_reply()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.reply_hidden_texts where reply_id = new.id;
  new.hidden_at := null;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."forget_hidden_text_of_deleted_reply"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.hide_review_at_three_reports()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (select count(*) from public.review_reports where review_id = new.review_id) >= 3 then
    update public.reviews
       set hidden_at = now()
     where id = new.review_id
       and hidden_at is null;
  end if;
  return null;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."hide_review_at_three_reports"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (select 1 from public.admins where user_id = auth.uid());
$function$;

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.new_place_must_be_complete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.photo_url is null then
    raise exception 'A new place needs a photo.' using errcode = '23514';
  end if;
  if new.description is null or btrim(new.description) = '' then
    raise exception 'A new place needs a description.' using errcode = '23514';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."new_place_must_be_complete"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.notify_on_new_reply()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  recipient uuid;
  what text;
begin
  if new.parent_reply_id is null then
    select user_id into recipient from public.reviews where id = new.review_id;
    what := 'review_reply';
  else
    select user_id into recipient from public.review_replies where id = new.parent_reply_id;
    what := 'reply_answer';
  end if;

  if recipient is not null and recipient <> new.user_id then
    -- 037: actor_id, so a later name change reaches this notification.
    insert into public.notifications (user_id, kind, review_id, reply_id, actor_id, actor_name)
    values (recipient, what, new.review_id, new.id, new.user_id, new.replier_name);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_reply_like()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  recipient uuid;
  under_review uuid;
begin
  select user_id, review_id into recipient, under_review
    from public.review_replies
   where id = new.reply_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, kind, review_id, reply_id, actor_id, actor_name)
    select recipient, 'reply_like', under_review, new.reply_id, new.user_id,
           public.public_name_of(u.raw_user_meta_data)
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_review_like()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  recipient uuid;
begin
  select user_id into recipient from public.reviews where id = new.review_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, kind, review_id, actor_id, actor_name)
    select recipient, 'review_like', new.review_id, new.user_id,
           public.public_name_of(u.raw_user_meta_data)
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.place_categories_before_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from public.destinations d where d.category = old.id)
     or exists (select 1 from public.accommodations a where a.type = old.id) then
    raise exception 'Some places still use it.' using errcode = '23503';
  end if;
  return old;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_categories_before_delete"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.place_categories_check_photo_place()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.photo_place_id is not null
     and new.photo_place_id is distinct from old.photo_place_id
     and not (
       (new.applies_to = 'destination' and exists (
          select 1 from public.destinations d where d.id = new.photo_place_id and d.category = new.id))
       or (new.applies_to = 'accommodation' and exists (
          select 1 from public.accommodations a where a.id = new.photo_place_id and a.type = new.id))
     ) then
    raise exception 'Please choose a photo of one of this category''s own places.' using errcode = '23514';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_categories_check_photo_place"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.place_category_must_exist()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  wanted text;
  sort text;
begin
  if tg_table_name = 'destinations' then
    wanted := new.category;
    sort := 'destination';
  else
    wanted := new.type;
    sort := 'accommodation';
  end if;

  if not exists (
    select 1 from public.place_categories c
     where c.id = wanted and c.applies_to = sort
  ) then
    raise exception 'That category or kind is not in the list.' using errcode = '23503';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_category_must_exist"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.place_cover_follows_photo_url()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.photo_url is null then
    return new;
  end if;
  update public.place_photos
     set photo_url = new.photo_url
   where place_type = tg_argv[0] and place_id = new.id and position = 1
     and photo_url is distinct from new.photo_url;
  if not exists (select 1 from public.place_photos
                  where place_type = tg_argv[0] and place_id = new.id and position = 1) then
    insert into public.place_photos (place_type, place_id, photo_url, position)
    values (tg_argv[0], new.id, new.photo_url, 1);
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_cover_follows_photo_url"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.place_location_from_coordinates()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  new.location := extensions.st_setsrid(
    extensions.st_makepoint(new.longitude::double precision, new.latitude::double precision),
    4326
  )::extensions.geography;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_location_from_coordinates"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.place_photo_credits_before_save()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'INSERT' and not (
       (new.place_type = 'destination'
          and exists (select 1 from public.destinations d where d.id = new.place_id))
    or (new.place_type = 'accommodation'
          and exists (select 1 from public.accommodations a where a.id = new.place_id))
  ) then
    raise exception 'That place does not exist.' using errcode = '23503';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."place_photo_credits_before_save"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.public_name_of (
  details jsonb
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select case
           when char_length(left(btrim(details ->> 'display_name'), 40)) >= 2
             then left(btrim(details ->> 'display_name'), 40)
           else 'Traveler'
         end;
$function$;

CREATE OR REPLACE FUNCTION public.review_photos_before_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  writer uuid;
begin
  select r.user_id into writer from public.reviews r where r.id = new.review_id for update;
  if writer is null then
    raise exception 'That review does not exist' using errcode = '23503';
  end if;

  if split_part(new.photo_path, '/', 1) <> writer::text then
    raise exception 'That photo is not yours' using errcode = '42501';
  end if;

  if (select count(*) from public.review_photos p where p.review_id = new.review_id) >= 4 then
    raise exception 'A review can have up to 4 photos.' using errcode = '23514';
  end if;

  -- The first free place, 1 to 4 (a removed photo frees its place).
  select min(n) into new.position
    from generate_series(1, 4) as n
   where not exists (
     select 1 from public.review_photos p
      where p.review_id = new.review_id and p.position = n
   );
  new.created_at := now();
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."review_photos_before_insert"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.review_replies_before_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  select public.public_name_of(u.raw_user_meta_data),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.replier_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  new.created_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_replies_before_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.hidden_at is distinct from old.hidden_at
     or new.trashed_at is distinct from old.trashed_at then
    new.updated_at := old.updated_at;
  elsif new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_replies_check_parent()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.parent_reply_id is not null
     and not exists (
       select 1
         from public.review_replies p
        where p.id = new.parent_reply_id
          and p.review_id = new.review_id
     ) then
    raise exception 'That reply isn''t under this review.'
      using errcode = '22023';
  end if;
  if exists (
       select 1
         from public.review_replies p
        where p.id = new.parent_reply_id
          and p.deleted_at is not null
     ) then
    raise exception 'That reply was deleted, so it can''t be answered.'
      using errcode = '55000';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_replies_keep_trashed_as_is()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if old.trashed_at is not null and new.trashed_at is not null
     and new.hidden_at is distinct from old.hidden_at then
    raise exception 'That reply is in the Trash. Restore it first.' using errcode = '55000';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_replies_parent_not_in_trash()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.parent_reply_id is not null
     and exists (select 1 from public.review_replies p
                  where p.id = new.parent_reply_id and p.trashed_at is not null) then
    raise exception 'That reply was deleted, so it can''t be answered.' using errcode = '55000';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."review_replies_parent_not_in_trash"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.reviews_before_write()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'UPDATE' then
    -- Auto-hide (ticket 110): hiding a review that really has 3 or more
    -- reports is allowed for anyone, because the database counts them
    -- itself here. Showing it again is still for admins only.
    if new.hidden_at is distinct from old.hidden_at
       and not public.is_admin()
       and not (
         old.hidden_at is null
         and new.hidden_at is not null
         and (select count(*) from public.review_reports rr where rr.review_id = old.id) >= 3
       ) then
      raise exception 'Only the Lakat Iloilo team can hide or show a review'
        using errcode = '42501';
    end if;
    if (select auth.uid()) is distinct from old.user_id
       and public.is_admin()
       and (new.rating is distinct from old.rating
            or new.comment is distinct from old.comment) then
      raise exception 'The team can hide or delete a review, not change it'
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.place_type = 'destination'
       and not exists (select 1 from public.destinations where id = new.place_id) then
      raise exception 'That destination does not exist';
    elsif new.place_type = 'accommodation'
       and not exists (select 1 from public.accommodations where id = new.place_id) then
      raise exception 'That accommodation does not exist';
    end if;
    new.created_at := now();
    -- A new review is never hidden.
    new.hidden_at := null;
  end if;

  select public.public_name_of(u.raw_user_meta_data),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.reviewer_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  if tg_op = 'INSERT'
     or new.rating is distinct from old.rating
     or new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reviews_place_not_in_trash()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (new.place_type = 'destination'
      and exists (select 1 from public.destinations where id = new.place_id and trashed_at is not null))
     or (new.place_type = 'accommodation'
      and exists (select 1 from public.accommodations where id = new.place_id and trashed_at is not null)) then
    raise exception 'That place does not exist';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."reviews_place_not_in_trash"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.reviews_video_must_be_own()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.video_path is not null
     and (split_part(new.video_path, '/', 1) <> new.user_id::text
          or new.video_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$') then
    raise exception 'That video is not yours'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.signal_reports_changed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.report_signals where created_at < now() - interval '1 day';
  insert into public.report_signals default values;
  return null;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."signal_reports_changed"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.signal_review_visibility()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.hidden_at is distinct from old.hidden_at then
    delete from public.review_visibility_signals
     where created_at < now() - interval '1 day';
    insert into public.review_visibility_signals (place_type, place_id)
    values (new.place_type, new.place_id);
  end if;
  return null;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."signal_review_visibility"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.unnotify_on_reply_unlike()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.notifications
   where kind = 'reply_like'
     and reply_id = old.reply_id
     and actor_id = old.user_id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.unnotify_on_review_unlike()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.notifications
   where kind = 'review_like'
     and review_id = old.review_id
     and actor_id = old.user_id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

ALTER TABLE "public"."accommodations"
  ADD CONSTRAINT "accommodations_trashed_by_fkey" FOREIGN KEY (trashed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admins"
  ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."destinations"
  ADD CONSTRAINT "destinations_trashed_by_fkey" FOREIGN KEY (trashed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."place_photo_credits"
  ADD CONSTRAINT "place_photo_credits_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."place_photo_credits"
  ADD CONSTRAINT "place_photo_credits_photo_id_fkey" FOREIGN KEY (photo_id) REFERENCES public.place_photos(id) ON DELETE CASCADE;

ALTER TABLE "public"."reply_hidden_texts"
  ADD CONSTRAINT "reply_hidden_texts_hidden_by_fkey" FOREIGN KEY (hidden_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_reply_id_fkey" FOREIGN KEY (reply_id) REFERENCES public.review_replies(id) ON DELETE CASCADE;

ALTER TABLE "public"."reply_hidden_texts"
  ADD CONSTRAINT "reply_hidden_texts_reply_id_fkey" FOREIGN KEY (reply_id) REFERENCES public.review_replies(id) ON DELETE CASCADE;

ALTER TABLE "public"."reply_likes"
  ADD CONSTRAINT "reply_likes_reply_id_fkey" FOREIGN KEY (reply_id) REFERENCES public.review_replies(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_replies"
  ADD CONSTRAINT "review_replies_parent_reply_id_fkey" FOREIGN KEY (parent_reply_id) REFERENCES public.review_replies(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_replies"
  ADD CONSTRAINT "review_replies_trashed_by_fkey" FOREIGN KEY (trashed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_likes"
  ADD CONSTRAINT "review_likes_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_photos"
  ADD CONSTRAINT "review_photos_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_replies"
  ADD CONSTRAINT "review_replies_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_reports"
  ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_trashed_by_fkey" FOREIGN KEY (trashed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."trashed_reply_texts"
  ADD CONSTRAINT "trashed_reply_texts_reply_id_fkey" FOREIGN KEY (reply_id) REFERENCES public.review_replies(id) ON DELETE CASCADE;

ALTER TABLE "public"."trashed_reply_texts"
  ADD CONSTRAINT "trashed_reply_texts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX notifications_actor_idx ON public.notifications USING btree (actor_id, kind);

CREATE INDEX notifications_reply_idx ON public.notifications USING btree (reply_id);

CREATE INDEX notifications_review_idx ON public.notifications USING btree (review_id);

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX place_categories_name_once ON public.place_categories USING btree (lower(btrim(name)));

CREATE INDEX place_photos_place ON public.place_photos USING btree (place_type, place_id);

CREATE INDEX review_photos_review_id ON public.review_photos USING btree (review_id);

CREATE INDEX review_replies_parent_idx ON public.review_replies USING btree (parent_reply_id);

CREATE INDEX review_replies_review_idx ON public.review_replies USING btree (review_id, created_at);

CREATE INDEX reviews_place_idx ON public.reviews USING btree (place_type, place_id, created_at DESC);

CREATE TRIGGER copy_profile_to_reviews_and_replies
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN
    ((((old.raw_user_meta_data ->> 'display_name'::text) IS DISTINCT FROM (new.raw_user_meta_data ->> 'display_name'::text)) OR ((old.raw_user_meta_data ->> 'traveler_type'::text)
    IS DISTINCT FROM (new.raw_user_meta_data ->> 'traveler_type'::text))))
  EXECUTE FUNCTION public.copy_profile_to_reviews_and_replies();

CREATE TRIGGER accommodation_cover_follows_photo_url
  AFTER INSERT OR UPDATE OF photo_url ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_cover_follows_photo_url('accommodation');

CREATE TRIGGER accommodation_credits_go_with_it
  AFTER DELETE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_credits_of_place('accommodation');

CREATE TRIGGER accommodation_kind_must_exist
  BEFORE INSERT OR UPDATE OF TYPE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_category_must_exist();

CREATE TRIGGER accommodation_location_from_coordinates
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_location_from_coordinates();

CREATE TRIGGER accommodation_photos_go_with_it
  AFTER DELETE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_photos_of_place('accommodation');

CREATE TRIGGER accommodation_reviews_go_with_it
  AFTER DELETE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reviews_of_place('accommodation');

CREATE TRIGGER new_accommodation_must_be_complete
  BEFORE INSERT ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.new_place_must_be_complete();

CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER destination_category_must_exist
  BEFORE INSERT OR UPDATE OF category ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_category_must_exist();

CREATE TRIGGER destination_cover_follows_photo_url
  AFTER INSERT OR UPDATE OF photo_url ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_cover_follows_photo_url('destination');

CREATE TRIGGER destination_credits_go_with_it
  AFTER DELETE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_credits_of_place('destination');

CREATE TRIGGER destination_location_from_coordinates
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.place_location_from_coordinates();

CREATE TRIGGER destination_photos_go_with_it
  AFTER DELETE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_photos_of_place('destination');

CREATE TRIGGER destination_reviews_go_with_it
  AFTER DELETE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reviews_of_place('destination');

CREATE TRIGGER new_destination_must_be_complete
  BEFORE INSERT ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.new_place_must_be_complete();

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER place_categories_before_delete
  BEFORE DELETE ON public.place_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.place_categories_before_delete();

CREATE TRIGGER place_categories_check_photo_place
  BEFORE UPDATE OF photo_place_id ON public.place_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.place_categories_check_photo_place();

CREATE TRIGGER place_photo_credits_before_save
  BEFORE INSERT OR UPDATE ON public.place_photo_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.place_photo_credits_before_save();

CREATE TRIGGER notify_on_reply_like
  AFTER INSERT ON public.reply_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reply_like();

CREATE TRIGGER unnotify_on_reply_unlike
  AFTER DELETE ON public.reply_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.unnotify_on_reply_unlike();

CREATE TRIGGER notify_on_review_like
  AFTER INSERT ON public.review_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_review_like();

CREATE TRIGGER unnotify_on_review_unlike
  AFTER DELETE ON public.review_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.unnotify_on_review_unlike();

CREATE TRIGGER review_photos_before_insert
  BEFORE INSERT ON public.review_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.review_photos_before_insert();

CREATE TRIGGER notify_on_new_reply
  AFTER INSERT ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_reply();

CREATE TRIGGER review_replies_before_insert
  BEFORE INSERT ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.review_replies_before_insert();

CREATE TRIGGER review_replies_before_update
  BEFORE UPDATE ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.review_replies_before_update();

CREATE TRIGGER review_replies_check_parent
  BEFORE INSERT ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.review_replies_check_parent();

CREATE TRIGGER review_replies_forget_hidden_text
  BEFORE UPDATE OF deleted_at ON public.review_replies
  FOR EACH ROW
  WHEN (((new.deleted_at IS NOT NULL) AND (old.deleted_at IS NULL)))
  EXECUTE FUNCTION public.forget_hidden_text_of_deleted_reply();

CREATE TRIGGER review_replies_keep_trashed_as_is
  BEFORE UPDATE OF hidden_at ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.review_replies_keep_trashed_as_is();

CREATE TRIGGER review_replies_parent_not_in_trash
  BEFORE INSERT ON public.review_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.review_replies_parent_not_in_trash();

CREATE TRIGGER hide_review_at_three_reports
  AFTER INSERT ON public.review_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.hide_review_at_three_reports();

CREATE TRIGGER signal_reports_changed
  AFTER INSERT OR DELETE ON public.review_reports
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.signal_reports_changed();

CREATE TRIGGER reviews_before_write
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_before_write();

CREATE TRIGGER reviews_place_not_in_trash
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_place_not_in_trash();

CREATE TRIGGER reviews_video_must_be_own
  BEFORE INSERT OR UPDATE OF video_path ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_video_must_be_own();

CREATE TRIGGER signal_review_visibility
  AFTER UPDATE OF hidden_at ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.signal_review_visibility();

CREATE POLICY "admins can add accommodations" ON "public"."accommodations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete accommodations" ON "public"."accommodations"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can edit accommodations" ON "public"."accommodations"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT public.is_admin() AS is_admin) AND (trashed_at IS NULL)))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read accommodations" ON "public"."accommodations"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((trashed_at IS NULL));

CREATE POLICY "api can read accommodations" ON "public"."accommodations"
  FOR SELECT
  TO "lakat_api"
  USING ((trashed_at IS NULL));

CREATE POLICY "people can read their own admin row" ON "public"."admins"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "admins can add destinations" ON "public"."destinations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete destinations" ON "public"."destinations"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can edit destinations" ON "public"."destinations"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT public.is_admin() AS is_admin) AND (trashed_at IS NULL)))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read destinations" ON "public"."destinations"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((trashed_at IS NULL));

CREATE POLICY "api can read destinations" ON "public"."destinations"
  FOR SELECT
  TO "lakat_api"
  USING ((trashed_at IS NULL));

CREATE POLICY "travelers can mark their own notifications read" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "travelers can read their own notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "admins can add categories" ON "public"."place_categories"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete categories" ON "public"."place_categories"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can rename categories" ON "public"."place_categories"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read categories" ON "public"."place_categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "api can read categories" ON "public"."place_categories"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "admins can add photo credits" ON "public"."place_photo_credits"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can change photo credits" ON "public"."place_photo_credits"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete photo credits" ON "public"."place_photo_credits"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can read photo credits" ON "public"."place_photo_credits"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "api can read photo credits" ON "public"."place_photo_credits"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "admins can add place photos" ON "public"."place_photos"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can change place photos" ON "public"."place_photos"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete place photos" ON "public"."place_photos"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can read place photos" ON "public"."place_photos"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "api can read place photos" ON "public"."place_photos"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "admins can read hidden reply texts" ON "public"."reply_hidden_texts"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "api can read hidden reply texts" ON "public"."reply_hidden_texts"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "admins can remove any reply like" ON "public"."reply_likes"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read reply likes" ON "public"."reply_likes"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "api can read reply likes" ON "public"."reply_likes"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "anyone can read report signals" ON "public"."report_signals"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "admins can remove any review like" ON "public"."review_likes"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read review likes" ON "public"."review_likes"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "api can read review likes" ON "public"."review_likes"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "anyone can see photos of reviews they can read" ON "public"."review_photos"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE (r.id = review_photos.review_id))));

CREATE POLICY "api can see photos of visible reviews" ON "public"."review_photos"
  FOR SELECT
  TO "lakat_api"
  USING ((EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE (r.id = review_photos.review_id))));

CREATE POLICY "anyone can read review replies" ON "public"."review_replies"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "api can read review replies" ON "public"."review_replies"
  FOR SELECT
  TO "lakat_api"
  USING (true);

CREATE POLICY "admins can delete reports" ON "public"."review_reports"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can read reports" ON "public"."review_reports"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read visibility signals" ON "public"."review_visibility_signals"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "admins can delete any review" ON "public"."reviews"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can hide and show reviews" ON "public"."reviews"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin))
  WITH CHECK (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "anyone can read visible reviews" ON "public"."reviews"
  FOR SELECT
  TO "anon"
  USING (((hidden_at IS NULL) AND (trashed_at IS NULL)));

CREATE POLICY "api can read visible reviews" ON "public"."reviews"
  FOR SELECT
  TO "lakat_api"
  USING (((hidden_at IS NULL) AND (trashed_at IS NULL)));

CREATE POLICY "admins can read trashed reply texts" ON "public"."trashed_reply_texts"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT public.is_admin() AS is_admin));

CREATE POLICY "admins can delete place photos" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'place-photos'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "admins can delete review photos" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'review-photos'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "admins can delete review videos" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'review-videos'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "admins can replace place photos" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'place-photos'::text) AND ( SELECT public.is_admin() AS is_admin)))
  WITH CHECK (((bucket_id = 'place-photos'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "admins can upload place photos" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'place-photos'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "anyone can view place photos" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'place-photos'::text));

CREATE POLICY "anyone can view review photos" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'review-photos'::text));

CREATE POLICY "anyone can view review videos" ON "storage"."objects"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((bucket_id = 'review-videos'::text));

CREATE POLICY "travelers can delete their own photos" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "travelers can delete their own videos" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "travelers can replace their own photos" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)))
  WITH CHECK (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "travelers can replace their own videos" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)))
  WITH CHECK (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "travelers can upload to their own photo folder" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "travelers can upload to their own video folder" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."accommodations";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."destinations";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."notifications";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."place_categories";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."reply_likes";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."report_signals";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."review_likes";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."review_photos";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."review_replies";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."review_visibility_signals";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."reviews";

COMMENT ON EXTENSION "postgis" IS 'PostGIS geometry and geography spatial types and functions';

GRANT EXECUTE ON FUNCTION "public"."admin_delete_place_for_good"(text, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_delete_place_for_good"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_place_for_good"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_place_for_good"(text, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_reply_for_good"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_delete_reply_for_good"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_reply_for_good"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_reply_for_good"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_review_for_good"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_delete_review_for_good"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_review_for_good"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_delete_review_for_good"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_empty_expired_trash"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_empty_expired_trash"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_empty_expired_trash"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_empty_expired_trash"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_hide_reply"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_hide_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_hide_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_hide_reply"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_likers"(text, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_likers"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_likers"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_likers"(text, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_place"(text, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_restore_place"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_place"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_place"(text, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_reply"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_restore_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_reply"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_review"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_restore_review"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_review"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_restore_review"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_show_reply"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_show_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_show_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_show_reply"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_storage_used"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_storage_used"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_storage_used"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_storage_used"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_place"(text, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trash_place"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_place"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_place"(text, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_reply"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trash_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_reply"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_review"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trash_review"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_review"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trash_review"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_places"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trashed_places"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_places"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_places"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_replies"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trashed_replies"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_replies"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_replies"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_review_videos"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trashed_review_videos"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_review_videos"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_review_videos"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_reviews"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_trashed_reviews"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_reviews"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_trashed_reviews"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."copy_profile_to_reviews_and_replies"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."copy_profile_to_reviews_and_replies"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."copy_profile_to_reviews_and_replies"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."copy_profile_to_reviews_and_replies"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_credits_of_place"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_credits_of_place"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_credits_of_place"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_credits_of_place"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_own_reply"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_own_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_own_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_own_reply"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_photos_of_place"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_photos_of_place"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_photos_of_place"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_photos_of_place"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_reviews_of_place"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_reviews_of_place"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_reviews_of_place"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_reviews_of_place"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."delete_trashed_reply"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_trashed_reply"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_trashed_reply"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."files_of_place"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."files_of_place"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."files_of_place"(text, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."forget_hidden_text_of_deleted_reply"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."forget_hidden_text_of_deleted_reply"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."forget_hidden_text_of_deleted_reply"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."forget_hidden_text_of_deleted_reply"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."hide_review_at_three_reports"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."hide_review_at_three_reports"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."hide_review_at_three_reports"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."is_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."new_place_must_be_complete"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."new_place_must_be_complete"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."new_place_must_be_complete"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."notify_on_new_reply"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."notify_on_new_reply"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_new_reply"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_new_reply"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."notify_on_reply_like"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."notify_on_reply_like"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_reply_like"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_reply_like"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."notify_on_review_like"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."notify_on_review_like"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_review_like"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."notify_on_review_like"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."place_categories_before_delete"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_categories_before_delete"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_categories_before_delete"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."place_categories_check_photo_place"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."place_categories_check_photo_place"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_categories_check_photo_place"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_categories_check_photo_place"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."place_category_must_exist"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_category_must_exist"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_category_must_exist"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."place_cover_follows_photo_url"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."place_cover_follows_photo_url"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_cover_follows_photo_url"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_cover_follows_photo_url"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."place_location_from_coordinates"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_location_from_coordinates"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_location_from_coordinates"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."place_photo_credits_before_save"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."place_photo_credits_before_save"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_photo_credits_before_save"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."place_photo_credits_before_save"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."public_name_of"(jsonb) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."public_name_of"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."public_name_of"(jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."public_name_of"(jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."review_photos_before_insert"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_photos_before_insert"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_photos_before_insert"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_insert"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."review_replies_before_insert"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_insert"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_insert"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_update"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."review_replies_before_update"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_update"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_before_update"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_replies_check_parent"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."review_replies_check_parent"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_check_parent"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_check_parent"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_replies_keep_trashed_as_is"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."review_replies_keep_trashed_as_is"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_keep_trashed_as_is"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_keep_trashed_as_is"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_replies_parent_not_in_trash"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."review_replies_parent_not_in_trash"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_parent_not_in_trash"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."review_replies_parent_not_in_trash"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."reviews_before_write"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."reviews_before_write"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_before_write"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_before_write"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."reviews_place_not_in_trash"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."reviews_place_not_in_trash"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_place_not_in_trash"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_place_not_in_trash"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."reviews_video_must_be_own"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."reviews_video_must_be_own"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_video_must_be_own"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."reviews_video_must_be_own"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."signal_reports_changed"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."signal_reports_changed"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."signal_reports_changed"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."signal_review_visibility"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."signal_review_visibility"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."signal_review_visibility"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_reply_unlike"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."unnotify_on_reply_unlike"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_reply_unlike"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_reply_unlike"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_review_unlike"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."unnotify_on_review_unlike"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_review_unlike"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."unnotify_on_review_unlike"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

REVOKE ALL ON SCHEMA "public" FROM "lakat_api";

GRANT USAGE ON SCHEMA "public" TO "lakat_api";

REVOKE ALL ON SEQUENCE "public"."report_signals_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."report_signals_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."report_signals_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."report_signals_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."report_signals_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."report_signals_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."report_signals_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."report_signals_id_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."review_visibility_signals_id_seq" FROM "anon";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."review_visibility_signals_id_seq" TO "anon";

REVOKE ALL ON SEQUENCE "public"."review_visibility_signals_id_seq" FROM "authenticated";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."review_visibility_signals_id_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."review_visibility_signals_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."review_visibility_signals_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."review_visibility_signals_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."review_visibility_signals_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."accommodations" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."accommodations" TO "anon";

REVOKE ALL ON TABLE "public"."accommodations" FROM "authenticated";

REVOKE ALL ("address") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("address"), UPDATE ("address") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("email") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("email"), UPDATE ("email") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("id") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("latitude") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("latitude"), UPDATE ("latitude") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("location_type") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("location_type"), UPDATE ("location_type") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("longitude") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("longitude"), UPDATE ("longitude") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("name"), UPDATE ("name") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("phone"), UPDATE ("phone") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("photo_url") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("photo_url"), UPDATE ("photo_url") ON TABLE "public"."accommodations" TO "authenticated";

REVOKE ALL ("type") ON TABLE "public"."accommodations" FROM "authenticated";

GRANT INSERT ("type"), UPDATE ("type") ON TABLE "public"."accommodations" TO "authenticated";

GRANT DELETE, MAINTAIN, SELECT ON TABLE "public"."accommodations" TO "authenticated";

GRANT SELECT ON TABLE "public"."accommodations" TO "lakat_api";

REVOKE ALL ON TABLE "public"."accommodations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accommodations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accommodations" TO "service_role";

REVOKE ALL ON TABLE "public"."admins" FROM "authenticated";

GRANT SELECT ON TABLE "public"."admins" TO "authenticated";

REVOKE ALL ON TABLE "public"."admins" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admins" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admins" TO "service_role";

REVOKE ALL ON TABLE "public"."destinations" FROM "anon";

GRANT MAINTAIN, SELECT ON TABLE "public"."destinations" TO "anon";

REVOKE ALL ON TABLE "public"."destinations" FROM "authenticated";

REVOKE ALL ("address") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("address"), UPDATE ("address") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("category") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("category"), UPDATE ("category") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("id") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("latitude") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("latitude"), UPDATE ("latitude") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("location_type") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("location_type"), UPDATE ("location_type") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("longitude") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("longitude"), UPDATE ("longitude") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("name"), UPDATE ("name") ON TABLE "public"."destinations" TO "authenticated";

REVOKE ALL ("photo_url") ON TABLE "public"."destinations" FROM "authenticated";

GRANT INSERT ("photo_url"), UPDATE ("photo_url") ON TABLE "public"."destinations" TO "authenticated";

GRANT DELETE, MAINTAIN, SELECT ON TABLE "public"."destinations" TO "authenticated";

GRANT SELECT ON TABLE "public"."destinations" TO "lakat_api";

REVOKE ALL ON TABLE "public"."destinations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."destinations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."destinations" TO "service_role";

REVOKE ALL ON TABLE "public"."notifications" FROM "authenticated";

REVOKE ALL ("read_at") ON TABLE "public"."notifications" FROM "authenticated";

GRANT UPDATE ("read_at") ON TABLE "public"."notifications" TO "authenticated";

GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";

REVOKE ALL ON TABLE "public"."notifications" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "service_role";

REVOKE ALL ON TABLE "public"."place_categories" FROM "anon";

GRANT SELECT ON TABLE "public"."place_categories" TO "anon";

REVOKE ALL ON TABLE "public"."place_categories" FROM "authenticated";

REVOKE ALL ("applies_to") ON TABLE "public"."place_categories" FROM "authenticated";

GRANT INSERT ("applies_to") ON TABLE "public"."place_categories" TO "authenticated";

REVOKE ALL ("icon") ON TABLE "public"."place_categories" FROM "authenticated";

GRANT UPDATE ("icon") ON TABLE "public"."place_categories" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."place_categories" FROM "authenticated";

GRANT INSERT ("id") ON TABLE "public"."place_categories" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."place_categories" FROM "authenticated";

GRANT INSERT ("name"), UPDATE ("name") ON TABLE "public"."place_categories" TO "authenticated";

REVOKE ALL ("photo_place_id") ON TABLE "public"."place_categories" FROM "authenticated";

GRANT UPDATE ("photo_place_id") ON TABLE "public"."place_categories" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."place_categories" TO "authenticated";

GRANT SELECT ON TABLE "public"."place_categories" TO "lakat_api";

REVOKE ALL ON TABLE "public"."place_categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_categories" TO "service_role";

REVOKE ALL ON TABLE "public"."place_photo_credits" FROM "authenticated";

REVOKE ALL ("authorization_status") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("authorization_status"), UPDATE ("authorization_status") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("credit_line") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("credit_line"), UPDATE ("credit_line") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("for_photo_url") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("for_photo_url"), UPDATE ("for_photo_url") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("licence") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("licence"), UPDATE ("licence") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("photo_id") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("photo_id") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("photographer") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("photographer"), UPDATE ("photographer") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("place_id") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("place_id") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("place_type") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("place_type") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("publisher") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("publisher"), UPDATE ("publisher") ON TABLE "public"."place_photo_credits" TO "authenticated";

REVOKE ALL ("source_url") ON TABLE "public"."place_photo_credits" FROM "authenticated";

GRANT INSERT ("source_url"), UPDATE ("source_url") ON TABLE "public"."place_photo_credits" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."place_photo_credits" TO "authenticated";

GRANT SELECT ON TABLE "public"."place_photo_credits" TO "lakat_api";

REVOKE ALL ON TABLE "public"."place_photo_credits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_photo_credits" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_photo_credits" TO "service_role";

REVOKE ALL ON TABLE "public"."place_photos" FROM "authenticated";

REVOKE ALL ("photo_url") ON TABLE "public"."place_photos" FROM "authenticated";

GRANT INSERT ("photo_url"), UPDATE ("photo_url") ON TABLE "public"."place_photos" TO "authenticated";

REVOKE ALL ("place_id") ON TABLE "public"."place_photos" FROM "authenticated";

GRANT INSERT ("place_id") ON TABLE "public"."place_photos" TO "authenticated";

REVOKE ALL ("place_type") ON TABLE "public"."place_photos" FROM "authenticated";

GRANT INSERT ("place_type") ON TABLE "public"."place_photos" TO "authenticated";

REVOKE ALL ("position") ON TABLE "public"."place_photos" FROM "authenticated";

GRANT INSERT ("position"), UPDATE ("position") ON TABLE "public"."place_photos" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."place_photos" TO "authenticated";

GRANT SELECT ON TABLE "public"."place_photos" TO "lakat_api";

REVOKE ALL ON TABLE "public"."place_photos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_photos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."place_photos" TO "service_role";

REVOKE ALL ON TABLE "public"."reply_hidden_texts" FROM "authenticated";

GRANT SELECT ON TABLE "public"."reply_hidden_texts" TO "authenticated";

GRANT SELECT ON TABLE "public"."reply_hidden_texts" TO "lakat_api";

REVOKE ALL ON TABLE "public"."reply_hidden_texts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reply_hidden_texts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reply_hidden_texts" TO "service_role";

REVOKE ALL ON TABLE "public"."reply_likes" FROM "anon";

GRANT SELECT ON TABLE "public"."reply_likes" TO "anon";

REVOKE ALL ON TABLE "public"."reply_likes" FROM "authenticated";

REVOKE ALL ("reply_id") ON TABLE "public"."reply_likes" FROM "authenticated";

GRANT INSERT ("reply_id") ON TABLE "public"."reply_likes" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."reply_likes" TO "authenticated";

GRANT SELECT ON TABLE "public"."reply_likes" TO "lakat_api";

REVOKE ALL ON TABLE "public"."reply_likes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reply_likes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reply_likes" TO "service_role";

REVOKE ALL ON TABLE "public"."report_signals" FROM "anon";

GRANT SELECT ON TABLE "public"."report_signals" TO "anon";

REVOKE ALL ON TABLE "public"."report_signals" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_signals" TO "authenticated";

REVOKE ALL ON TABLE "public"."report_signals" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_signals" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_signals" TO "service_role";

REVOKE ALL ON TABLE "public"."review_likes" FROM "anon";

GRANT SELECT ON TABLE "public"."review_likes" TO "anon";

REVOKE ALL ON TABLE "public"."review_likes" FROM "authenticated";

REVOKE ALL ("review_id") ON TABLE "public"."review_likes" FROM "authenticated";

GRANT INSERT ("review_id") ON TABLE "public"."review_likes" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."review_likes" TO "authenticated";

GRANT SELECT ON TABLE "public"."review_likes" TO "lakat_api";

REVOKE ALL ON TABLE "public"."review_likes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_likes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_likes" TO "service_role";

REVOKE ALL ON TABLE "public"."review_photos" FROM "anon";

GRANT SELECT ON TABLE "public"."review_photos" TO "anon";

REVOKE ALL ON TABLE "public"."review_photos" FROM "authenticated";

REVOKE ALL ("photo_path") ON TABLE "public"."review_photos" FROM "authenticated";

GRANT INSERT ("photo_path") ON TABLE "public"."review_photos" TO "authenticated";

REVOKE ALL ("review_id") ON TABLE "public"."review_photos" FROM "authenticated";

GRANT INSERT ("review_id") ON TABLE "public"."review_photos" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."review_photos" TO "authenticated";

GRANT SELECT ON TABLE "public"."review_photos" TO "lakat_api";

REVOKE ALL ON TABLE "public"."review_photos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_photos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_photos" TO "service_role";

REVOKE ALL ON TABLE "public"."review_replies" FROM "anon";

GRANT SELECT ON TABLE "public"."review_replies" TO "anon";

REVOKE ALL ON TABLE "public"."review_replies" FROM "authenticated";

REVOKE ALL ("comment") ON TABLE "public"."review_replies" FROM "authenticated";

GRANT INSERT ("comment"), UPDATE ("comment") ON TABLE "public"."review_replies" TO "authenticated";

REVOKE ALL ("parent_reply_id") ON TABLE "public"."review_replies" FROM "authenticated";

GRANT INSERT ("parent_reply_id") ON TABLE "public"."review_replies" TO "authenticated";

REVOKE ALL ("review_id") ON TABLE "public"."review_replies" FROM "authenticated";

GRANT INSERT ("review_id") ON TABLE "public"."review_replies" TO "authenticated";

GRANT SELECT ON TABLE "public"."review_replies" TO "authenticated";

GRANT SELECT ON TABLE "public"."review_replies" TO "lakat_api";

REVOKE ALL ON TABLE "public"."review_replies" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_replies" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_replies" TO "service_role";

REVOKE ALL ON TABLE "public"."review_reports" FROM "authenticated";

REVOKE ALL ("created_at") ON TABLE "public"."review_reports" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."review_reports" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."review_reports" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."review_reports" TO "authenticated";

REVOKE ALL ("note") ON TABLE "public"."review_reports" FROM "authenticated";

GRANT INSERT ("note"), SELECT ("note") ON TABLE "public"."review_reports" TO "authenticated";

REVOKE ALL ("reason") ON TABLE "public"."review_reports" FROM "authenticated";

GRANT INSERT ("reason"), SELECT ("reason") ON TABLE "public"."review_reports" TO "authenticated";

REVOKE ALL ("review_id") ON TABLE "public"."review_reports" FROM "authenticated";

GRANT INSERT ("review_id"), SELECT ("review_id") ON TABLE "public"."review_reports" TO "authenticated";

GRANT DELETE ON TABLE "public"."review_reports" TO "authenticated";

REVOKE ALL ON TABLE "public"."review_reports" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_reports" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_reports" TO "service_role";

REVOKE ALL ON TABLE "public"."review_visibility_signals" FROM "anon";

GRANT SELECT ON TABLE "public"."review_visibility_signals" TO "anon";

REVOKE ALL ON TABLE "public"."review_visibility_signals" FROM "authenticated";

GRANT SELECT ON TABLE "public"."review_visibility_signals" TO "authenticated";

REVOKE ALL ON TABLE "public"."review_visibility_signals" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_visibility_signals" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_visibility_signals" TO "service_role";

REVOKE ALL ON TABLE "public"."reviews" FROM "anon";

GRANT SELECT ON TABLE "public"."reviews" TO "anon";

REVOKE ALL ON TABLE "public"."reviews" FROM "authenticated";

REVOKE ALL ("comment") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("comment"), UPDATE ("comment") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("hidden_at") ON TABLE "public"."reviews" FROM "authenticated";

GRANT UPDATE ("hidden_at") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("place_id") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("place_id") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("place_type") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("place_type") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("rating") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("rating"), UPDATE ("rating") ON TABLE "public"."reviews" TO "authenticated";

REVOKE ALL ("video_path") ON TABLE "public"."reviews" FROM "authenticated";

GRANT INSERT ("video_path"), UPDATE ("video_path") ON TABLE "public"."reviews" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."reviews" TO "authenticated";

GRANT SELECT ON TABLE "public"."reviews" TO "lakat_api";

REVOKE ALL ON TABLE "public"."reviews" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "service_role";

REVOKE ALL ON TABLE "public"."trashed_reply_texts" FROM "authenticated";

GRANT SELECT ON TABLE "public"."trashed_reply_texts" TO "authenticated";

REVOKE ALL ON TABLE "public"."trashed_reply_texts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trashed_reply_texts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trashed_reply_texts" TO "service_role";

ALTER TABLE "public"."reply_likes"
  ADD CONSTRAINT "reply_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "travelers can remove their own reply likes" ON "public"."reply_likes"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

ALTER TABLE "public"."review_likes"
  ADD CONSTRAINT "review_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "travelers can remove their own likes" ON "public"."review_likes"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

ALTER TABLE "public"."review_replies"
  ADD CONSTRAINT "review_replies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "travelers can like other travelers' replies" ON "public"."reply_likes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.review_replies r
  WHERE ((r.id = reply_likes.reply_id) AND (r.user_id <> ( SELECT auth.uid() AS uid)) AND (r.deleted_at IS NULL) AND (r.hidden_at IS NULL))))));

CREATE POLICY "repliers can edit their own replies" ON "public"."review_replies"
  FOR UPDATE
  TO "authenticated"
  USING (((( SELECT auth.uid() AS uid) = user_id) AND (deleted_at IS NULL) AND (hidden_at IS NULL)))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (deleted_at IS NULL) AND (hidden_at IS NULL)));

CREATE POLICY "travelers can add their own replies" ON "public"."review_replies"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

ALTER TABLE "public"."review_reports"
  ADD CONSTRAINT "review_reports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX reviews_one_per_traveler_and_place ON public.reviews USING btree (user_id, place_type, place_id)
  WHERE (trashed_at IS NULL);

CREATE POLICY "travelers can like other travelers' reviews" ON "public"."review_likes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id = review_likes.review_id) AND (r.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "writers can add photos to their own reviews" ON "public"."review_photos"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id = review_photos.review_id) AND (r.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "writers can remove photos from their own reviews" ON "public"."review_photos"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id = review_photos.review_id) AND (r.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "travelers can report other travelers' reviews" ON "public"."review_reports"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.reviews r
  WHERE ((r.id = review_reports.review_id) AND (r.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "authors can delete their own reviews" ON "public"."reviews"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "authors can edit their own reviews" ON "public"."reviews"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "travelers can add their own reviews" ON "public"."reviews"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "travelers can read visible and their own reviews" ON "public"."reviews"
  FOR SELECT
  TO "authenticated"
  USING (((trashed_at IS NULL) AND ((hidden_at IS NULL) OR (( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin))));

