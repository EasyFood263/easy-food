import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const roles = [
  ["customer", "👤", "Customer", "Order food, checkout and track deliveries"],
  ["restaurant", "🍔", "Restaurant", "Manage menu, orders and settlements"],
  ["rider", "🛵", "Rider", "Pay daily fee and accept deliveries"],
  ["admin", "⚙️", "Admin", "Control the complete marketplace"],
] as const;

export default function Roles() {
  return <View style={s.container}>
    <Text style={s.logo}>EF</Text>
    <Text style={s.title}>Choose your workspace</Text>
    <Text style={s.sub}>The same Easy Food app uses role-based access for customers, restaurants, independent riders and the owner.</Text>
    {roles.map(([role, icon, name, desc]) => <Pressable key={role} style={s.card} onPress={() => router.push({ pathname: "/dashboard", params: { role } })}>
      <Text style={s.icon}>{icon}</Text><View style={{ flex: 1 }}><Text style={s.role}>{name}</Text><Text style={s.desc}>{desc}</Text></View><Text style={s.arrow}>›</Text>
    </Pressable>)}
    <Pressable onPress={() => router.back()}><Text style={s.back}>Back</Text></Pressable>
  </View>;
}
const s=StyleSheet.create({container:{flex:1,padding:24,backgroundColor:'#F7FBFD',justifyContent:'center'},logo:{width:48,height:48,borderRadius:14,backgroundColor:'#54B8E8',color:'#fff',textAlign:'center',paddingTop:12,fontWeight:'900',marginBottom:18},title:{fontSize:30,fontWeight:'800',color:'#17202A'},sub:{fontSize:15,color:'#6B7280',marginTop:8,marginBottom:24,lineHeight:22},card:{backgroundColor:'#fff',borderRadius:16,padding:17,marginBottom:11,flexDirection:'row',alignItems:'center',gap:13,shadowOpacity:.05,shadowRadius:8},icon:{fontSize:30},role:{fontSize:17,fontWeight:'800',color:'#17202A'},desc:{fontSize:12,color:'#6B7280',marginTop:3},arrow:{fontSize:28,color:'#F26AA8'},back:{textAlign:'center',marginTop:14,color:'#54B8E8',fontWeight:'700'}});
