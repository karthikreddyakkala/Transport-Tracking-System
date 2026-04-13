CREATE TYPE "public"."bus_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('passenger', 'driver', 'admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bus_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"bus_id" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"speed" real DEFAULT 0 NOT NULL,
	"heading" real DEFAULT 0 NOT NULL,
	"current_stop_index" integer DEFAULT 0,
	"next_stop_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bus_locations_bus_id_unique" UNIQUE("bus_id")
);
--> statement-breakpoint
CREATE TABLE "bus_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20),
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"address" text,
	"image_url" text,
	"amenities" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buses" (
	"id" text PRIMARY KEY NOT NULL,
	"number" varchar(20) NOT NULL,
	"registration_number" varchar(30),
	"capacity" integer DEFAULT 40 NOT NULL,
	"current_route_id" text,
	"driver_id" text,
	"status" "bus_status" DEFAULT 'inactive' NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buses_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_message" text NOT NULL,
	"ai_response" text NOT NULL,
	"context_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eta_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"bus_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"predicted_arrival" timestamp NOT NULL,
	"confidence" integer DEFAULT 70 NOT NULL,
	"minutes_away" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"route_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historical_data" (
	"id" text PRIMARY KEY NOT NULL,
	"bus_id" text NOT NULL,
	"route_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"scheduled_arrival" timestamp,
	"actual_arrival" timestamp NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" text PRIMARY KEY NOT NULL,
	"reported_by_id" text,
	"stop_id" text,
	"bus_id" text,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"priority" "issue_priority" DEFAULT 'medium' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"bus_id" text NOT NULL,
	"current_route_id" text NOT NULL,
	"recommended_route_id" text,
	"reason" text NOT NULL,
	"time_saved_minutes" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"status" "recommendation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"stop_order" integer NOT NULL,
	"distance_from_prev" real DEFAULT 0,
	"estimated_minutes_from_start" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"number" varchar(20) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
	"status" "route_status" DEFAULT 'active' NOT NULL,
	"start_stop_id" text,
	"end_stop_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "routes_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "traffic_conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"segment_start_lat" real NOT NULL,
	"segment_start_lng" real NOT NULL,
	"segment_end_lat" real NOT NULL,
	"segment_end_lng" real NOT NULL,
	"traffic_level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'passenger' NOT NULL,
	"phone" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_locations" ADD CONSTRAINT "bus_locations_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_locations" ADD CONSTRAINT "bus_locations_next_stop_id_bus_stops_id_fk" FOREIGN KEY ("next_stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buses" ADD CONSTRAINT "buses_current_route_id_routes_id_fk" FOREIGN KEY ("current_route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buses" ADD CONSTRAINT "buses_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eta_predictions" ADD CONSTRAINT "eta_predictions_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eta_predictions" ADD CONSTRAINT "eta_predictions_stop_id_bus_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_routes" ADD CONSTRAINT "favorite_routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_routes" ADD CONSTRAINT "favorite_routes_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_data" ADD CONSTRAINT "historical_data_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_data" ADD CONSTRAINT "historical_data_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_data" ADD CONSTRAINT "historical_data_stop_id_bus_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_stop_id_bus_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_recommendations" ADD CONSTRAINT "route_recommendations_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_recommendations" ADD CONSTRAINT "route_recommendations_current_route_id_routes_id_fk" FOREIGN KEY ("current_route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_recommendations" ADD CONSTRAINT "route_recommendations_recommended_route_id_routes_id_fk" FOREIGN KEY ("recommended_route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_bus_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bus_locations_bus_id_idx" ON "bus_locations" USING btree ("bus_id");--> statement-breakpoint
CREATE INDEX "bus_stops_lat_lng_idx" ON "bus_stops" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "eta_bus_stop_idx" ON "eta_predictions" USING btree ("bus_id","stop_id");