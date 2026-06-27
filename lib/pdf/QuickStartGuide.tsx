/**
 * Branded 2-page Dentily quick start guide, rendered entirely server-side via
 * @react-pdf/renderer (see app/api/download/route.ts). No client-side PDF code.
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const COLORS = {
  navy: "#0f172a",
  skyBlue: "#0ea5e9",
  skyLight: "#e0f2fe",
  white: "#ffffff",
  offWhite: "#f8fafc",
  border: "#e2e8f0",
  muted: "#64748b",
  body: "#334155",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.offWhite,
    paddingBottom: 56,
    fontSize: 11,
    color: COLORS.navy,
    fontFamily: "Helvetica",
  },
  headerBar: {
    backgroundColor: COLORS.navy,
    paddingVertical: 22,
    paddingHorizontal: 40,
  },
  headerAccentStripe: {
    height: 4,
    backgroundColor: COLORS.skyBlue,
    marginHorizontal: -40,
    marginTop: -22,
    marginBottom: 18,
  },
  wordmark: {
    color: COLORS.white,
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  tagline: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.75,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    marginBottom: 14,
  },
  sectionSpacer: {
    marginTop: 30,
  },
  pillRow: {
    flexDirection: "row",
    gap: 12,
  },
  pill: {
    flex: 1,
    backgroundColor: COLORS.skyLight,
    borderWidth: 0,
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  pillValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: COLORS.skyBlue,
  },
  pillLabel: {
    fontSize: 9.5,
    color: COLORS.muted,
    marginTop: 5,
    textAlign: "center",
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  tableHeadRow: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  th: {
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  td: {
    fontSize: 10.5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    color: COLORS.body,
  },
  colType: { width: "30%" },
  colCount: { width: "28%" },
  colDesc: { width: "42%" },
  tdMutedCount: {
    color: COLORS.skyBlue,
    fontFamily: "Helvetica-Bold",
  },
  footerNote: {
    marginTop: 26,
    fontSize: 9.5,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  step: {
    flexDirection: "row",
    marginBottom: 18,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "center",
    paddingTop: 6,
    marginRight: 12,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 10.5,
    color: COLORS.body,
    lineHeight: 1.5,
  },
  stepEm: {
    fontFamily: "Helvetica-Oblique",
    color: COLORS.muted,
  },
  mono: {
    fontFamily: "Courier",
    color: COLORS.navy,
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
});

type BreakdownRow = { type: string; count: string; description: string };

function PageFooter({ page }: { page: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>Questions? Email hello@dentily.co</Text>
      <Text>Page {page} of 2</Text>
    </View>
  );
}

export interface QuickStartGuideProps {
  market: string;
  totalPractices: number;
  contactableLeads: number;
  topPriorityLeads: number;
  emailCount: number;
  formCount: number;
  phoneCount: number;
}

export function QuickStartGuide({
  market,
  totalPractices,
  contactableLeads,
  topPriorityLeads,
  emailCount,
  formCount,
  phoneCount,
}: QuickStartGuideProps) {
  const stats = [
    { value: String(totalPractices), label: "Dental Practices" },
    { value: String(contactableLeads), label: "Contactable Leads" },
    { value: String(topPriorityLeads), label: "Top-Priority Leads" },
  ];

  const breakdown: BreakdownRow[] = [
    { type: "Email leads", count: `${emailCount} practices`, description: "Ready to email directly" },
    { type: "Contact Form", count: `${formCount} practices`, description: "Submit via their web form" },
    { type: "Phone only", count: `${phoneCount} practices`, description: "Call or voicemail" },
  ];

  return (
    <Document
      title={`Dentily — ${market} Dental Leads Quick Start Guide`}
      author="Dentily"
      subject={`Quick start guide for your ${market} Dental Leads Pack`}
    >
      {/* Page 1 — Welcome & What's Inside */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View style={styles.headerAccentStripe} />
          <Text style={styles.wordmark}>Dentily</Text>
          <Text style={styles.tagline}>{market} Dental Leads Pack</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>What&apos;s inside</Text>
          <View style={styles.pillRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.pill}>
                <Text style={styles.pillValue}>{s.value}</Text>
                <Text style={styles.pillLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>Your lead breakdown</Text>
            <View style={styles.table}>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.th, styles.colType]}>Contact type</Text>
                <Text style={[styles.th, styles.colCount]}>Volume</Text>
                <Text style={[styles.th, styles.colDesc]}>What to do</Text>
              </View>
              {breakdown.map((row) => (
                <View key={row.type} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colType]}>{row.type}</Text>
                  <Text style={[styles.td, styles.colCount, styles.tdMutedCount]}>{row.count}</Text>
                  <Text style={[styles.td, styles.colDesc]}>{row.description}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.footerNote}>
            All leads are verified {market}-area dental practices sourced from Google Maps and enriched
            with contact data.
          </Text>
        </View>

        <PageFooter page={1} />
      </Page>

      {/* Page 2 — How to Use This Pack — unchanged */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View style={styles.headerAccentStripe} />
          <Text style={styles.wordmark}>Dentily</Text>
          <Text style={styles.tagline}>How to use this pack</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Open in Google Sheets or Excel</Text>
              <Text style={styles.stepDesc}>
                Upload the CSV via File &gt; Import. Freeze row 1 as your header.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Sort by Priority, then Score</Text>
              <Text style={styles.stepDesc}>
                Filter Priority = High first, then sort Score descending. These are your warmest leads.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Start with Email leads</Text>
              <Text style={styles.stepDesc}>
                Filter &quot;Best Contact Method&quot; = Email. These have verified addresses and the
                highest reply rate.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>4</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Fill in your 3 placeholders</Text>
              <Text style={styles.stepDesc}>
                Every outreach draft contains <Text style={styles.mono}>{"{{your_name}}"}</Text>,{" "}
                <Text style={styles.mono}>{"{{your_company}}"}</Text>, and{" "}
                <Text style={styles.mono}>{"{{your_credibility_line}}"}</Text>. Find &amp; replace all
                three before sending anything. Example credibility line:{" "}
                <Text style={styles.stepEm}>
                  &quot;I help dental practices grow their new patient pipeline — I&apos;ve worked with
                  8 practices in the last 18 months.&quot;
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <Text style={styles.stepNum}>5</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Use the Outreach Draft column</Text>
              <Text style={styles.stepDesc}>
                Each lead has a personalized cold email pre-written. Customize the subject line and
                send. For phone-only leads, use the Voicemail Script column.
              </Text>
            </View>
          </View>
        </View>

        <PageFooter page={2} />
      </Page>
    </Document>
  );
}

export default QuickStartGuide;
