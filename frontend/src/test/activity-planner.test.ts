import { describe,it,expect } from 'vitest';
import {compareWindows,initialPreferences,mockForecast,type ForecastHour} from '@/lib/activity-planner';
const hour=(h:number,pm25=42,apparent=29,rain=10):ForecastHour=>({hour:h,pm25,apparent,rain,status:'available'});
describe('Activity window preferences',()=>{
 it('chooses the complete 45-minute mock window at 6 PM with 42 µg/m³, 29°C and 10% rain',()=>{expect(compareWindows(mockForecast,initialPreferences)).toMatchObject({state:'qualified',block:{start:1080,end:1125,pm25:42,apparent:29,rain:10}});});
 it('requires two continuous hourly periods for a two-hour activity',()=>{expect(compareWindows([hour(18),hour(19)],{...initialPreferences,duration:120,start:1080,end:1200})).toMatchObject({state:'qualified',block:{start:1080,end:1200}});});
 it('does not qualify a two-hour task when the second hour exceeds the PM2.5 preference of 50',()=>{expect(compareWindows([hour(18),hour(19,75)],{...initialPreferences,duration:120,start:1080,end:1200})).toMatchObject({state:'no-slot',alternative:{pm25:75,exceeded:['PM2.5']}});});
 it('never recommends a block beyond selected availability',()=>{expect(compareWindows([hour(18),hour(19)],{...initialPreferences,duration:45,start:1095,end:1140})).toMatchObject({state:'qualified',block:{start:1095,end:1140}});});
 it('distinguishes missing forecast from failure to meet preferences',()=>{expect(compareWindows([{...hour(18),pm25:null,status:'missing'}],{...initialPreferences,start:1080,end:1140})).toEqual({state:'incomplete'});});
 it('does not bridge a missing hour for a two-hour block',()=>{expect(compareWindows([hour(18),{...hour(19),apparent:null,status:'missing'},hour(20)],{...initialPreferences,start:1080,end:1260,duration:120})).toEqual({state:'incomplete'});});
 it('qualifies values exactly at the apparent temperature preference',()=>{expect(compareWindows([hour(18,50,32,20)],{...initialPreferences,start:1080,end:1140})).toMatchObject({state:'qualified'});});
 it('rejects rain when rain is not acceptable',()=>{expect(compareWindows([hour(18)],{...initialPreferences,start:1080,end:1140,rainAcceptable:false})).toMatchObject({state:'no-slot',alternative:{exceeded:['Rain probability']}});});
 it('retains temperature violations in the alternative',()=>{expect(compareWindows([hour(18,42,35,10)],{...initialPreferences,start:1080,end:1140})).toMatchObject({state:'no-slot',alternative:{exceeded:['Apparent temperature']}});});
 it('excludes suspect data from comparisons',()=>{expect(compareWindows([{...hour(18),status:'suspect'}],{...initialPreferences,start:1080,end:1140})).toEqual({state:'incomplete'});});
});
