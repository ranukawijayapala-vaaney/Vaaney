import axios from 'axios';
import * as soap from 'soap';

// Aramex API Configuration
const ARAMEX_CONFIG = {
  username: process.env.ARAMEX_USERNAME || 'testingapi@aramex.com',
  password: process.env.ARAMEX_PASSWORD || 'R123456789$r',
  accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER || '20016',
  accountPin: process.env.ARAMEX_ACCOUNT_PIN || '121212',
  accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || 'AMM',
  accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || 'JO',
  version: 'v1.0',
  source: 24,
};

// API URLs
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://ws.aramex.net/shippingapi.v2/shipping/service_1_0.svc'
  : 'https://ws.dev.aramex.net/shippingapi.v2/shipping/service_1_0.svc';

const API_URL = `${BASE_URL}/json`;

// Rate Calculator SOAP endpoint
const RATE_CALCULATOR_WSDL = process.env.NODE_ENV === 'production'
  ? 'https://ws.aramex.net/shippingapi.v2/ratecalculator/service_1_0.svc?wsdl'
  : 'https://ws.dev.aramex.net/shippingapi.v2/ratecalculator/service_1_0.svc?wsdl';

// Types for Aramex API requests and responses
interface ClientInfo {
  UserName: string;
  Password: string;
  Version: string;
  AccountNumber: string;
  AccountPin: string;
  AccountEntity: string;
  AccountCountryCode: string;
  Source: number;
}

interface Address {
  Line1: string;
  Line2?: string;
  Line3?: string;
  City: string;
  StateOrProvinceCode?: string;
  PostCode?: string;
  CountryCode: string;
}

interface Contact {
  Department?: string;
  PersonName: string;
  CompanyName: string;
  PhoneNumber1: string;
  PhoneNumber2?: string;
  CellPhone?: string;
  EmailAddress: string;
}

interface Party {
  Reference1?: string;
  Reference2?: string;
  AccountNumber?: string;
  PartyAddress: Address;
  Contact: Contact;
}

interface Weight {
  Unit: 'KG' | 'LB';
  Value: number;
}

interface Dimensions {
  Unit: 'CM' | 'M';
  Length: number;
  Width: number;
  Height: number;
}

interface Money {
  CurrencyCode: string;
  Value: number;
}

interface ShipmentItem {
  PackageType: string;
  Quantity: number;
  Weight: Weight;
  Comments?: string;
  Reference?: string;
}

interface ShipmentDetails {
  Dimensions?: Dimensions;
  ActualWeight: Weight;
  ChargeableWeight?: Weight;
  DescriptionOfGoods?: string;
  GoodsOriginCountry?: string;
  NumberOfPieces: number;
  ProductGroup: string;
  ProductType: string;
  PaymentType: string;
  PaymentOptions?: string;
  Services?: string;
  Items: ShipmentItem[];
  CashOnDeliveryAmount?: Money;
  CustomsValueAmount?: Money;
}

interface Shipment {
  Reference1?: string;
  Reference2?: string;
  Reference3?: string;
  ForeignHAWB?: string;
  TransportType?: number;
  ShippingDateTime: string;
  DueDate?: string;
  Comments?: string;
  PickupLocation?: string;
  OperationsInstructions?: string;
  AccountingInstructions?: string;
  Details: ShipmentDetails;
  Shipper: Party;
  Consignee: Party;
  ThirdParty?: Party;
}

interface LabelInfo {
  ReportID: number;
  ReportType: 'URL' | 'RPT';
}

interface CreateShipmentRequest {
  ClientInfo: ClientInfo;
  Transaction?: {
    Reference1?: string;
    Reference2?: string;
    Reference3?: string;
  };
  Shipments: Shipment[];
  LabelInfo?: LabelInfo;
}

interface ProcessedShipment {
  ID: string;
  Reference1?: string;
  Reference2?: string;
  Reference3?: string;
  ForeignHAWB?: string;
  HasErrors: boolean;
  Notifications?: Array<{ Code: string; Message: string }>;
  ShipmentLabel?: {
    LabelURL?: string;
    LabelFileContents?: string;
  };
  ShipmentCharges?: {
    CurrencyCode: string;
    TotalAmount: number;
  };
}

interface CreateShipmentResponse {
  HasErrors: boolean;
  Notifications?: Array<{ Code: string; Message: string }>;
  Shipments?: ProcessedShipment[];
}

interface PickupItem {
  ProductGroup: string;
  ProductType: string;
  NumberOfShipments: number;
  PackageType: string;
  Payment: string;
  ShipmentWeight: Weight;
  ShipmentVolume?: {
    Unit: string;
    Value: number;
  };
  NumberOfPieces: number;
  CashAmount?: Money;
  Comments?: string;
}

interface PickupDetails {
  PickupAddress: Address;
  PickupContact: Contact;
  PickupLocation: string;
  PickupDate: string;
  ReadyTime: string;
  LastPickupTime: string;
  ClosingTime: string;
  Comments?: string;
  Reference1?: string;
  Reference2?: string;
  Vehicle?: string;
  Shipments?: any[];
  PickupItems: PickupItem[];
  Status: string;
}

interface CreatePickupRequest {
  ClientInfo: ClientInfo;
  Transaction?: {
    Reference1?: string;
  };
  Pickup: PickupDetails;
  LabelInfo?: LabelInfo;
}

interface CreatePickupResponse {
  HasErrors: boolean;
  Notifications?: Array<{ Code: string; Message: string }>;
  ProcessedPickup?: {
    ID: string;
    GUID: string;
    Reference1?: string;
  };
}

interface CancelPickupRequest {
  ClientInfo: ClientInfo;
  Transaction?: {
    Reference1?: string;
  };
  PickupGUID: string;
  Comments?: string;
}

interface PrintLabelRequest {
  ClientInfo: ClientInfo;
  Transaction?: {
    Reference1?: string;
  };
  ShipmentNumber: string;
  ProductGroup?: string;
  OriginEntity?: string;
  LabelInfo: LabelInfo;
}

// Helper function to get client info
function getClientInfo(): ClientInfo {
  return {
    UserName: ARAMEX_CONFIG.username,
    Password: ARAMEX_CONFIG.password,
    Version: ARAMEX_CONFIG.version,
    AccountNumber: ARAMEX_CONFIG.accountNumber,
    AccountPin: ARAMEX_CONFIG.accountPin,
    AccountEntity: ARAMEX_CONFIG.accountEntity,
    AccountCountryCode: ARAMEX_CONFIG.accountCountryCode,
    Source: ARAMEX_CONFIG.source,
  };
}

// Create Shipment
export async function createShipment(
  shipmentData: Omit<Shipment, 'ShippingDateTime'> & { ShippingDateTime?: string },
  generateLabel: boolean = true,
): Promise<CreateShipmentResponse> {
  try {
    const request: CreateShipmentRequest = {
      ClientInfo: getClientInfo(),
      Shipments: [
        {
          ...shipmentData,
          ShippingDateTime: shipmentData.ShippingDateTime || new Date().toISOString(),
        },
      ],
      LabelInfo: generateLabel
        ? {
            ReportID: 9201, // Standard shipping label
            ReportType: 'URL',
          }
        : undefined,
    };

    const response = await axios.post(`${API_URL}/CreateShipments`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Aramex createShipment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.Message || 'Failed to create shipment');
  }
}

// Print Label for existing shipment
export async function printLabel(
  awbNumber: string,
  productGroup: string = 'EXP',
  originEntity?: string,
): Promise<any> {
  try {
    const request: PrintLabelRequest = {
      ClientInfo: getClientInfo(),
      ShipmentNumber: awbNumber,
      ProductGroup: productGroup,
      OriginEntity: originEntity || ARAMEX_CONFIG.accountEntity,
      LabelInfo: {
        ReportID: 9201,
        ReportType: 'URL',
      },
    };

    const response = await axios.post(`${API_URL}/PrintLabel`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Aramex printLabel error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.Message || 'Failed to print label');
  }
}

// Create Pickup
export async function createPickup(pickupData: PickupDetails): Promise<CreatePickupResponse> {
  try {
    const request: CreatePickupRequest = {
      ClientInfo: getClientInfo(),
      Pickup: pickupData,
    };

    const response = await axios.post(`${API_URL}/CreatePickup`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Aramex createPickup error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.Message || 'Failed to create pickup');
  }
}

// Cancel Pickup
export async function cancelPickup(pickupGUID: string, comments?: string): Promise<any> {
  try {
    const request: CancelPickupRequest = {
      ClientInfo: getClientInfo(),
      PickupGUID: pickupGUID,
      Comments: comments,
    };

    const response = await axios.post(`${API_URL}/CancelPickup`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Aramex cancelPickup error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.Message || 'Failed to cancel pickup');
  }
}

// Helper function to format address for Aramex
export function formatAddress(addressString: string, countryCode: string = 'MV'): Address {
  const lines = addressString.split('\n').filter(line => line.trim());
  
  return {
    Line1: lines[0] || addressString.substring(0, 50),
    Line2: lines[1] || undefined,
    Line3: lines[2] || undefined,
    City: lines.length > 1 ? lines[lines.length - 1] : 'Male',
    CountryCode: countryCode,
  };
}

// Helper function to build tracking URL
export function getTrackingUrl(awbNumber: string): string {
  return `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${awbNumber}`;
}

// Track Shipments API - Get shipment status from Aramex
interface TrackShipmentsRequest {
  ClientInfo: ClientInfo;
  Shipments: string[]; // Array of AWB numbers
  GetLastTrackingUpdateOnly?: boolean;
}

interface ShipmentTrackingEvent {
  Event: string;
  EventDate: string;
  Location: string;
  Comments?: string;
}

interface ShipmentTrackingResult {
  WaybillNumber: string;
  UpdateCode: string;
  UpdateDescription: string;
  UpdateDateTime: string;
  UpdateLocation: string;
  Comments?: string;
  TrackingEvents?: ShipmentTrackingEvent[];
}

interface TrackShipmentsResponse {
  HasErrors: boolean;
  Error?: {
    Code: string;
    Message: string;
  };
  TrackingResults: ShipmentTrackingResult[];
}

export async function trackShipments(awbNumbers: string[]): Promise<TrackShipmentsResponse> {
  try {
    const request: TrackShipmentsRequest = {
      ClientInfo: getClientInfo(),
      Shipments: awbNumbers,
      GetLastTrackingUpdateOnly: true, // Get latest status only
    };

    const response = await axios.post(`${API_URL}/TrackShipments`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Aramex trackShipments error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.Message || 'Failed to track shipments');
  }
}

// Check if shipment is delivered based on Aramex status codes
export function isShipmentDelivered(updateCode: string): boolean {
  // Aramex delivery status codes (SH014, SH015, etc. indicate delivery)
  const deliveryStatusCodes = ['SH014', 'SH015', 'DEL', 'SH008'];
  return deliveryStatusCodes.includes(updateCode.toUpperCase());
}

// Types for Rate Calculator API
interface RateCalculatorShipmentDetails {
  Dimensions?: Dimensions;
  ActualWeight: Weight;
  ChargeableWeight?: Weight;
  DescriptionOfGoods?: string;
  GoodsOriginCountry?: string;
  NumberOfPieces: number;
  ProductGroup: string;
  ProductType: string;
  PaymentType: string;
  PaymentOptions?: string;
  Services?: string;
  CashOnDeliveryAmount?: Money;
  CustomsValueAmount?: Money;
  CashAdditionalAmount?: Money;
  CashAdditionalAmountDescription?: string;
  CollectAmount?: Money;
  Items?: ShipmentItem[];
}

interface CalculateRateRequest {
  ClientInfo: ClientInfo;
  Transaction?: {
    Reference1?: string;
    Reference2?: string;
  };
  OriginAddress: Address;
  DestinationAddress: Address;
  ShipmentDetails: RateCalculatorShipmentDetails;
}

interface RateCalculatorCharge {
  ChargeType: string;
  CurrencyCode: string;
  Amount: number;
}

interface CalculateRateResponse {
  HasErrors: boolean;
  Notifications?: Array<{ Code: string; Message: string }>;
  TotalAmount?: {
    CurrencyCode: string;
    Value: number;
  };
  RateBreakdown?: RateCalculatorCharge[];
}

// Calculate Shipping Rate using SOAP API
export async function calculateShippingRate(params: {
  originCountryCode: string;
  originCity: string;
  destinationCountryCode: string;
  destinationCity: string;
  weight: number; // in KG
  dimensions?: { length: number; width: number; height: number }; // in CM
  numberOfPieces?: number;
  productType?: string;
  productGroup?: string;
}): Promise<CalculateRateResponse> {
  try {
    const client = await soap.createClientAsync(RATE_CALCULATOR_WSDL);

    const request: CalculateRateRequest = {
      ClientInfo: getClientInfo(),
      OriginAddress: {
        Line1: 'Origin Address',
        City: params.originCity,
        CountryCode: params.originCountryCode,
      },
      DestinationAddress: {
        Line1: 'Destination Address',
        City: params.destinationCity,
        CountryCode: params.destinationCountryCode,
      },
      ShipmentDetails: {
        ActualWeight: {
          Unit: 'KG',
          Value: params.weight,
        },
        NumberOfPieces: params.numberOfPieces || 1,
        ProductGroup: params.productGroup || 'EXP', // Express
        ProductType: params.productType || 'PPX', // Aramex Priority Parcel Express
        PaymentType: 'P', // Prepaid
        ...(params.dimensions && {
          Dimensions: {
            Unit: 'CM',
            Length: params.dimensions.length,
            Width: params.dimensions.width,
            Height: params.dimensions.height,
          },
        }),
      },
    };

    const [result] = await client.CalculateRateAsync(request);
    
    return result as CalculateRateResponse;
  } catch (error: any) {
    console.error('Aramex calculateShippingRate error:', error.message);
    throw new Error('Failed to calculate shipping rate: ' + error.message);
  }
}
