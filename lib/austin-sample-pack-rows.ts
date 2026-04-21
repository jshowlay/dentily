import { makeFixtureExportRow } from "@/lib/lead-pipeline-fixtures";
import type { ExportLeadRow } from "@/lib/types";

/**
 * Austin practices with **verified** street addresses and phones from official location pages (April 2026).
 * Rating/review_count are omitted except Forest Family (Anderson), where figures match the public Yelp business summary.
 */
export const AUSTIN_SAMPLE_PACK_EXPORT_ROWS: ExportLeadRow[] = [
  makeFixtureExportRow({
    name: "38th Street Dental",
    address: "1500 W 38th St Ste 56, Austin, TX 78731, United States",
    website: "https://www.myaustindds.com/locations/austin-office",
    phone: "5124586222",
    contact_form_url: "https://www.myaustindds.com/contact",
  }),
  makeFixtureExportRow({
    name: "Gordon Dental",
    address: "300 West Ave Ste 1312, Austin, TX 78701, United States",
    website: "https://www.drdavidgordon.com/",
    phone: "5127088900",
    primary_email: "info@drdavidgordon.com",
    contact_form_url: "https://www.drdavidgordon.com/contact-us/",
  }),
  makeFixtureExportRow({
    name: "Thompson Dentistry",
    address: "3600 N Capital of Texas Hwy Ste 220, Austin, TX 78746, United States",
    website: "https://thompsondentistryaustin.com/",
    phone: "5129009697",
    contact_form_url: "https://thompsondentistryaustin.com/contact/",
  }),
  makeFixtureExportRow({
    name: "North Austin Dentistry",
    address: "6850 Austin Center Blvd #310, Austin, TX 78731, United States",
    website: "https://northaustindentist.com/",
    phone: "5124583111",
    contact_form_url: "https://northaustindentist.com/contact-us/",
  }),
  makeFixtureExportRow({
    name: "Smile 360",
    address: "1509 S Lamar Blvd Ste 675, Austin, TX 78704, United States",
    website: "https://www.smile360atx.com/",
    phone: "5124444746",
    contact_form_url: "https://www.smile360atx.com/contact",
  }),
  makeFixtureExportRow({
    name: "TRU Dentistry Austin",
    address: "9901 Brodie Ln Suite 130, Austin, TX 78748, United States",
    website: "https://www.trudentistryaustin.com/",
    phone: "7372038542",
    contact_form_url: "https://www.trudentistryaustin.com/contact",
  }),
  makeFixtureExportRow({
    name: "Forest Family Dentistry (Anderson)",
    address: "2700 W Anderson Ln, #418, Austin, TX 78757, United States",
    website: "https://www.forestfamily.com/locations/anderson",
    phone: "5123349894",
    contact_form_url: "https://www.forestfamily.com/contact",
    rating: 4.6,
    review_count: 387,
  }),
  makeFixtureExportRow({
    name: "Forest Family Dentistry (Burnet)",
    address: "5531 Burnet Rd, Austin, TX 78756, United States",
    website: "https://www.forestfamily.com/locations/burnet",
    phone: "5128989036",
    contact_form_url: "https://www.forestfamily.com/contact",
  }),
];
