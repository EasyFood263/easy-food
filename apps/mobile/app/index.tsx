import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  return <View style={styles.container}>
    <View style={styles.logo}><Text style={styles.logoText}>EF</Text></View>
    <Text style={styles.title}>Easy Food</Text>
    <Text style={styles.subtitle}>Food ordering made easy.</Text>
    <Pressable style={styles.button} onPress={() => router.push("/roles")}><Text style={styles.buttonText}>Get Started</Text></Pressable>
    <Text style={styles.note}>Customer • Restaurant • Rider • Admin</Text>
  </View>;
}
const styles=StyleSheet.create({container:{flex:1,justifyContent:"center",alignItems:"center",padding:28,backgroundColor:"#F7FBFD"},logo:{width:92,height:92,borderRadius:28,backgroundColor:"#54B8E8",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontSize:30,fontWeight:"800"},title:{fontSize:34,fontWeight:"800",marginTop:18,color:"#17202A"},subtitle:{fontSize:17,color:"#6B7280",marginTop:8},button:{marginTop:34,width:"100%",paddingVertical:16,borderRadius:14,backgroundColor:"#F26AA8",alignItems:"center"},buttonText:{color:"#fff",fontSize:16,fontWeight:"800"},note:{marginTop:18,color:"#6B7280"}});
