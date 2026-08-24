import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const roles=["Customer","Restaurant","Rider","Admin"];
export default function Roles(){return <View style={s.container}><Text style={s.title}>Choose your role</Text><Text style={s.sub}>You can sign in to the same Easy Food app with role-based access.</Text>{roles.map(r=><Pressable key={r} style={s.card} onPress={()=>{}}><Text style={s.role}>{r}</Text><Text style={s.arrow}>›</Text></Pressable>)}<Pressable onPress={()=>router.back()}><Text style={s.back}>Back</Text></Pressable></View>}
const s=StyleSheet.create({container:{flex:1,padding:24,backgroundColor:'#F7FBFD',justifyContent:'center'},title:{fontSize:30,fontWeight:'800',color:'#17202A'},sub:{fontSize:15,color:'#6B7280',marginTop:8,marginBottom:24,lineHeight:22},card:{backgroundColor:'#fff',borderRadius:16,padding:20,marginBottom:12,flexDirection:'row',justifyContent:'space-between',shadowOpacity:.05,shadowRadius:8},role:{fontSize:18,fontWeight:'700'},arrow:{fontSize:26,color:'#F26AA8'},back:{textAlign:'center',marginTop:14,color:'#54B8E8',fontWeight:'700'}});
