# Sample Energy Bill Statements

This directory contains 12 sample energy bill statements for a user in Austin, Texas, representing a full year of monthly bills (January 2024 - December 2024).

## Overview

These CSV files simulate realistic energy consumption patterns for a typical Austin, Texas household:

- **Winter months** (Dec-Feb): Moderate usage (1,000-1,200 kWh) - mild winters
- **Spring months** (Mar-May): Moderate usage (950-1,350 kWh) - comfortable weather
- **Summer months** (Jun-Aug): High usage (1,980-2,150 kWh) - peak AC usage
- **Fall months** (Sep-Nov): Moderate to high usage (1,050-1,650 kWh) - cooling still needed

## File Structure

Each CSV file contains:

- Header row with account information, utility details, and billing period
- Usage data points with date, kWh consumption, and cost

## Customer Information

- **Name**: John Smith
- **Account Number**: ACC-12345678
- **Address**: 1234 Oak Street, Austin, TX 78701
- **Utility**: Austin Energy

## Supplier Changes

The statements reflect realistic supplier changes throughout the year:

- **Jan-May**: Reliant Energy (Reliant Secure 12) - $0.115/kWh
- **Jun-Aug**: TXU Energy (TXU Energy Free Nights) - $0.128/kWh
- **Sep-Nov**: Green Mountain Energy (Green Mountain Pollution Free) - $0.122/kWh
- **Dec**: Direct Energy (Direct Energy Live Brighter 12) - $0.118/kWh

## Usage Patterns

| Month     | Total kWh | Total Cost | Notes                       |
| --------- | --------- | ---------- | --------------------------- |
| January   | 1,125     | $129.38    | Winter baseline             |
| February  | 1,080     | $124.20    | Winter baseline             |
| March     | 950       | $109.25    | Spring - comfortable        |
| April     | 1,020     | $117.30    | Spring - comfortable        |
| May       | 1,350     | $155.25    | Early summer - AC starts    |
| June      | 1,980     | $253.44    | Peak summer                 |
| July      | 2,150     | $275.20    | Peak summer (hottest month) |
| August    | 2,080     | $266.24    | Peak summer                 |
| September | 1,650     | $201.30    | Late summer - still warm    |
| October   | 1,180     | $143.96    | Fall - cooling reduced      |
| November  | 1,050     | $128.10    | Fall - comfortable          |
| December  | 1,200     | $141.60    | Winter - mild heating       |

## Usage

These files can be uploaded to the application's statement reader to:

1. Test the AI statement parsing functionality
2. Generate usage pattern analysis
3. Test recommendation algorithms with realistic data
4. Demonstrate seasonal usage variations

## Format

The CSV files are formatted to be compatible with the `read-statement` Lambda function, which uses AI to extract structured data from various file formats including CSV.
